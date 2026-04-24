import { Tramli, flowKey } from '@unlaxer/tramli';
import { api } from '../lib/api';

// ── Auth States ──────────────────────────────────────
// volta-auth-proxy (Java) の AuthState と対称
//
//   UNAUTHENTICATED  → LOGIN_REDIRECT → LOGIN_PENDING → CALLBACK_RECEIVED
//   → USER_RESOLVED → [MFA_PENDING | SESSION_CREATED] → COMPLETE
//                                                       → FAILED / EXPIRED
//
// フロントエンドでは OIDC リダイレクト / トークン交換はバックエンドが処理する。
// フロントは「今どのフェーズか」を追跡し、external ガードで API を叩いて
// バックエンドの状態を同期する。

/** @typedef {'UNAUTHENTICATED' | 'LOGIN_REDIRECT' | 'LOGIN_PENDING' | 'CALLBACK_RECEIVED' | 'USER_RESOLVED' | 'MFA_PENDING' | 'SESSION_CREATED' | 'COMPLETE' | 'FAILED' | 'EXPIRED'} AuthState */

const stateConfig = {
  UNAUTHENTICATED:   { terminal: false, initial: true },
  LOGIN_REDIRECT:    { terminal: false },
  LOGIN_PENDING:     { terminal: false },
  CALLBACK_RECEIVED: { terminal: false },
  USER_RESOLVED:     { terminal: false },
  MFA_PENDING:       { terminal: false },
  SESSION_CREATED:   { terminal: false },
  COMPLETE:          { terminal: true },
  FAILED:            { terminal: true },
  EXPIRED:           { terminal: true },
};

// ── Flow Keys (型安全なコンテキストキー) ─────────────
// Java 版 AuthData と対称
export const RequestOrigin  = flowKey('auth.request_origin');
export const AuthConfig     = flowKey('auth.config');
export const LoginRedirect  = flowKey('auth.login_redirect');
export const IdpCallback    = flowKey('auth.idp_callback');
export const ResolvedUser   = flowKey('auth.resolved_user');
export const MfaResult      = flowKey('auth.mfa_result');
export const SessionCookie  = flowKey('auth.session_cookie');
export const FinalRedirect  = flowKey('auth.final_redirect');
export const UserTenants    = flowKey('auth.user_tenants');

// ── Processors ───────────────────────────────────────

const loginRedirectInit = {
  name: 'LoginRedirectInit',
  requires: [RequestOrigin, AuthConfig],
  produces: [LoginRedirect],
  process(ctx) {
    const origin = ctx.get(RequestOrigin);
    const loginUrl = `/login?return_to=${encodeURIComponent(origin.returnTo)}`;
    ctx.put(LoginRedirect, { url: loginUrl });
  },
};

const redirectToLogin = {
  name: 'RedirectToLogin',
  requires: [],
  produces: [],
  process() { /* noop — UI がリダイレクトを実行 */ },
};

const resolveUser = {
  name: 'ResolveUser',
  requires: [IdpCallback],
  produces: [ResolvedUser],
  async process(ctx) {
    const user = await api.me();
    ctx.put(ResolvedUser, user);
  },
};

const sessionCreator = {
  name: 'SessionCreator',
  requires: [ResolvedUser],
  produces: [SessionCookie, FinalRedirect, UserTenants],
  async process(ctx) {
    const tenants = await api.myTenants();
    ctx.put(UserTenants, tenants);
    ctx.put(SessionCookie, { active: true });
    const origin = ctx.find(RequestOrigin);
    ctx.put(FinalRedirect, { url: origin?.returnTo || '/console/' });
  },
};

const finalRedirect = {
  name: 'FinalRedirect',
  requires: [],
  produces: [],
  process() { /* noop — UI が COMPLETE 表示に切り替え */ },
};

// ── Guards ────────────────────────────────────────────

const callbackGuard = {
  name: 'IdpCallbackGuard',
  requires: [LoginRedirect],
  produces: [IdpCallback],
  maxRetries: 1,
  validate(ctx) {
    // URL にコールバックパラメータがあるか検証
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      return {
        type: 'accepted',
        data: Tramli.data([IdpCallback, { code, state }]),
      };
    }
    return { type: 'rejected', reason: 'Waiting for IdP callback' };
  },
};

const sessionCheckGuard = {
  name: 'SessionCheckGuard',
  requires: [],
  produces: [IdpCallback, ResolvedUser],
  maxRetries: 1,
  async validate() {
    // Cookie ベースセッションが有効ならスキップして直接解決
    try {
      const user = await api.me();
      return {
        type: 'accepted',
        data: Tramli.data(
          [IdpCallback, { code: 'session', state: 'existing' }],
          [ResolvedUser, user],
        ),
      };
    } catch {
      return { type: 'rejected', reason: 'No active session' };
    }
  },
};

const mfaGuard = {
  name: 'MfaVerifyGuard',
  requires: [ResolvedUser],
  produces: [MfaResult],
  maxRetries: 3,
  validate(ctx) {
    const mfaResult = ctx.find(MfaResult);
    if (mfaResult?.verified) {
      return { type: 'accepted' };
    }
    return { type: 'rejected', reason: 'MFA not verified' };
  },
};

// ── Branch ────────────────────────────────────────────

const mfaCheck = {
  name: 'MfaCheck',
  requires: [ResolvedUser],
  decide(ctx) {
    const user = ctx.get(ResolvedUser);
    return user.mfaRequired ? 'mfa_required' : 'no_mfa';
  },
};

// ── FlowDefinition ───────────────────────────────────
// Java 版 "volta-auth-oidc" と対称

export const authFlowDefinition = Tramli.define('volta-auth-oidc', stateConfig)
  .setTtl(10 * 60 * 1000) // 10 minutes
  .setMaxGuardRetries(3)
  .strictMode()
  .initiallyAvailable(RequestOrigin, AuthConfig)

  // UNAUTHENTICATED → LOGIN_REDIRECT (auto)
  .from('UNAUTHENTICATED').auto('LOGIN_REDIRECT', loginRedirectInit)

  // LOGIN_REDIRECT → LOGIN_PENDING (auto)
  .from('LOGIN_REDIRECT').auto('LOGIN_PENDING', redirectToLogin)

  // LOGIN_PENDING → CALLBACK_RECEIVED (external: IdP コールバック待ち)
  .from('LOGIN_PENDING').external('CALLBACK_RECEIVED', callbackGuard)

  // CALLBACK_RECEIVED → USER_RESOLVED (auto: ユーザー情報取得)
  .from('CALLBACK_RECEIVED').auto('USER_RESOLVED', resolveUser)

  // USER_RESOLVED → [SESSION_CREATED | MFA_PENDING] (branch: MFA 判定)
  .from('USER_RESOLVED')
    .branch(mfaCheck)
    .to('SESSION_CREATED', 'no_mfa', sessionCreator)
    .to('MFA_PENDING', 'mfa_required')
    .endBranch()

  // MFA_PENDING → SESSION_CREATED (external: MFA 認証待ち)
  .from('MFA_PENDING').external('SESSION_CREATED', mfaGuard, sessionCreator)

  // SESSION_CREATED → COMPLETE (auto)
  .from('SESSION_CREATED').auto('COMPLETE', finalRedirect)

  // Error handling
  .onAnyError('FAILED')
  .build();

// ── Session-check 用の短縮フロー ──────────────────────
// 初回ロード時にセッション Cookie が有効なら OIDC を経由せず直接認証する。
// これはフロントエンド独自の「再接続」フローで、Java 版とは異なる。

const resumeStateConfig = {
  CHECKING:      { terminal: false, initial: true },
  AUTHENTICATED: { terminal: true },
  NO_SESSION:    { terminal: true },
};

export const ResumeUser    = flowKey('resume.user');
export const ResumeTenants = flowKey('resume.tenants');

export const sessionResumeDefinition = Tramli.define('session-resume', resumeStateConfig)
  .setTtl(30_000) // 30 seconds
  .strictMode()
  .from('CHECKING').external('AUTHENTICATED', {
    name: 'SessionResumeGuard',
    requires: [],
    produces: [ResumeUser, ResumeTenants],
    maxRetries: 1,
    async validate() {
      try {
        const [user, tenants] = await Promise.all([api.me(), api.myTenants()]);
        return {
          type: 'accepted',
          data: Tramli.data(
            [ResumeUser, user],
            [ResumeTenants, tenants],
          ),
        };
      } catch {
        return { type: 'rejected', reason: 'No active session' };
      }
    },
  })
  .onAnyError('NO_SESSION')
  .build();
