// --- URL prefix の規約 ---------------------------------------------------
// このフロントが叩くサーバー (volta-auth-proxy / Javalin) は、歴史的経緯で
// 3 種類の prefix を持つ。クライアントから「勝手に統一」するとサーバーの
// ルート登録 (ApiRouter.java) と食い違って 404 になるため、規約として固定する。
//
//   API_BASE  = '/api/v1'  … 管理・テナント・ユーザー系の正規 REST API。
//                            原則すべてここに寄せる (request() のデフォルト)。
//                            「ログイン中ユーザー自身」のセッション一覧/失効も
//                            /api/v1/users/me/sessions に統一済み (下記参照)。
//   ME_BASE   = '/api/me'  … 【非推奨・後方互換のみ】かつてセッション系を置いた
//                            prefix。Phase 4 時点ではサーバーが /api/me/sessions
//                            のみ登録しており /api/v1 へ寄せられなかったが、
//                            auth-proxy 側に GET/DELETE /api/v1/users/me/sessions
//                            を追加したため、フロントは /api/v1 配下へ統一した。
//                            旧 /api/me/sessions と /auth/sessions/{id} は
//                            サーバー側に後方互換で残っている (削除はしない) が、
//                            このフロントからはもう叩かない。
//   /auth/...              … ForwardAuth / ログイン・ログアウト等の認証
//                            アクション用。REST リソースではなく意味が異なる
//                            ので /api/v1 とは別物として扱う。
//
// nginx.conf 側は `location /api/` と `location /auth/` の 2 ブロックで
// まとめて proxy しているので、上記 3 prefix はすべて同一 upstream に届く。
const API_BASE = '/api/v1';
// ME_BASE ('/api/me') は廃止。セッション系は API_BASE 配下 (/api/v1/users/me/...)
// に統一した。サーバー側に後方互換ルートは残るが、フロントからは参照しない。

async function request(path, options = {}) {
  return rawRequest(`${API_BASE}${path}`, options);
}

async function rawRequest(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function items(path, options) {
  return request(path, options).then(d => d.items || d);
}

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(Object.fromEntries(entries)).toString();
}

function paginated(path, params = {}) {
  return request(`${path}${buildQuery(params)}`);
}

export const api = {
  // Users
  me: () => request('/users/me'),
  myTenants: () => request('/users/me/tenants').then(d => d.items || d),
  listUsers: (params) => params ? paginated('/admin/users', params) : items('/admin/users'),

  // Tenants
  getTenant: (tid) => request(`/tenants/${tid}`),
  adminTenants: () => items('/admin/tenants'),
  suspendTenant: (tid) => request(`/admin/tenants/${tid}/suspend`, { method: 'POST' }),
  activateTenant: (tid) => request(`/admin/tenants/${tid}/activate`, { method: 'POST' }),
  updateTenant: (tid, data) => request(`/tenants/${tid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Members
  listMembers: (tid, params) => params ? paginated(`/tenants/${tid}/members`, params) : items(`/tenants/${tid}/members`),
  updateMember: (tid, mid, data) => request(`/tenants/${tid}/members/${mid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Invitations
  listInvitations: (tid, params) => params ? paginated(`/tenants/${tid}/invitations`, params) : items(`/tenants/${tid}/invitations`),
  createInvitation: (tid, data) => request(`/tenants/${tid}/invitations`, { method: 'POST', body: JSON.stringify(data) }),
  deleteInvitation: (tid, iid) => request(`/tenants/${tid}/invitations/${iid}`, { method: 'DELETE' }),

  // Sessions
  // listSessions は管理者向け (/api/v1/admin/sessions)。
  listSessions: (params) => paginated('/admin/sessions', params),
  // mySessions / revokeSession は「自分自身」のセッションを扱う。
  // 統一先ルート: GET /api/v1/users/me/sessions (一覧) /
  //               DELETE /api/v1/users/me/sessions/{id} (失効)。
  // auth-proxy 側にこのルートを追加したため、管理系と同じ API_BASE (/api/v1)
  // 配下に寄せた。旧 /api/me/sessions・/auth/sessions/{id} はサーバーに
  // 後方互換で残るがフロントからは叩かない。
  // request() 経由で API_BASE が自動付与され、401/非2xx のエラーハンドリングも共通化される。
  mySessions: () => request('/users/me/sessions').then(d => d.items || d),
  revokeSession: (id) => request(`/users/me/sessions/${id}`, { method: 'DELETE' }),

  // Audit
  listAudit: (params) => params ? paginated('/admin/audit', params) : items('/admin/audit'),

  // IdP
  listIdpConfigs: (tid) => items(`/tenants/${tid}/idp-configs`),

  // Webhooks
  listWebhooks: (tid) => items(`/tenants/${tid}/webhooks`),
  createWebhook: (tid, data) => request(`/tenants/${tid}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
  updateWebhook: (tid, wid, data) => request(`/tenants/${tid}/webhooks/${wid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWebhook: (tid, wid) => request(`/tenants/${tid}/webhooks/${wid}`, { method: 'DELETE' }),
  listWebhookDeliveries: (tid, wid) => items(`/tenants/${tid}/webhooks/${wid}/deliveries`),

  // MFA
  adminResetMfa: (tid, uid) => request(`/tenants/${tid}/members/${uid}/mfa`, { method: 'DELETE' }),

  // Keys
  listKeys: () => items('/admin/keys'),
  rotateKeys: () => request('/admin/keys/rotate', { method: 'POST' }),
};
