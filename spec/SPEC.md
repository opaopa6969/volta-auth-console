# volta-auth-console — SPEC

バージョン: 0.2.0  
作成日: 2026-04-19  
対象リポジトリ: opaopa6969/volta-auth-console

---

## 1. 概要

volta-auth-console は **volta-auth-proxy** (Java バックエンド) の管理 UI として機能する
**React + Vite** 製の Single Page Application (SPA) である。

### 1.1 役割

| 項目 | 内容 |
|------|------|
| 種別 | 管理コンソール SPA |
| バックエンド | volta-auth-proxy (port 7070) |
| 認証方式 | Cookie ベースセッション + OIDC (バックエンド処理) |
| スタイリング | Tailwind CSS v4 (Vite プラグイン経由) |
| 状態管理 | Zustand v5 |
| ルーティング | React Router DOM v7 |
| フロー管理 | @unlaxer/tramli (session-resume フロー) |
| ビジュアライズ | @unlaxer/tramli-viz (VizDashboard, dynamic import) |

### 1.2 エントリポイント

```
index.html
  └── src/main.jsx          BrowserRouter + StrictMode ラップ
        └── src/App.jsx     認証ガード + Routes 定義
```

`main.jsx` は `BrowserRouter` で全体をラップし、`App.jsx` が
`useAuthFlow()` フックを起動してセッション確認を行う。
認証済みであれば Sidebar + `<Routes>` が描画される。
未認証の場合は `/login?return_to=...` へのリンクを表示する。

---

## 2. 機能仕様

### 2.1 画面一覧 (12 画面)

| # | パス | コンポーネント | 概要 |
|---|------|--------------|------|
| 1 | `/` | `Dashboard` | 統計カード 4 枚 (全件 fetch) |
| 2 | `/users` | `Users` | ユーザー一覧 (サーバーページネーション) |
| 3 | `/tenants` | `Tenants` | テナント管理 (suspend/activate/MFA toggle) |
| 4 | `/members` | `Members` | テナントメンバー一覧 (ロール別表示) |
| 5 | `/invitations` | `Invitations` | 招待コード管理 (status フィルター付き) |
| 6 | `/sessions` | `Sessions` | セッション一覧・失効 (サーバーページネーション) |
| 7 | `/audit` | `Audit` | 監査ログ (日時範囲・イベント種別フィルター) |
| 8 | `/idp` | `IdpConfig` | IdP 設定一覧 (read-only) |
| 9 | `/webhooks` | `Webhooks` | Webhook CRUD + 配信履歴 |
| 10 | `/keys` | `SigningKeys` | 署名鍵一覧・ローテーション |
| 11 | `/settings` | `Settings` | プロフィール編集・MFA 状態・自セッション管理 |
| 12 | `/monitor` | `Monitor` | SSE ライブフィード + tramli-viz VizDashboard |

### 2.2 ナビゲーション (Sidebar)

`src/components/Sidebar.jsx` がサイドバーを描画する。
12 リンクを保持し、`admin: true` フラグが付いた **Monitor** は
`role === 'ADMIN' || role === 'OWNER'` のユーザーにのみ表示される。

```
volta-auth-console v0.2.0  ← フッターに固定
```

### 2.3 各画面の操作仕様

#### Dashboard (`/`)
- `user` が zustand にセットされた直後に `Promise.all` で以下を全件 fetch:
  - `api.listUsers()` → `users.length` → Total Users カード
  - `api.adminTenants()` → `tenants.length` → Tenants カード
  - `api.listAudit()` → `LOGIN_SUCCESS` 件数 → Recent Logins カード
  - `api.listAudit()` → `event?.startsWith('ERROR')` 件数 → Errors カード
- `AuthFlowStatus` コンポーネントを右上に表示 (state="AUTHENTICATED" 固定)

#### Users (`/users`)
- `usePaginatedQuery(api.listUsers, { defaultSize: 20, defaultSort: 'email' })`
- MFA 有効ユーザーに "Reset MFA" ボタン → `api.adminResetMfa(tenantId, userId)`
- URL パラメータ: `?page=&size=&sort=&q=`

#### Tenants (`/tenants`)
- `api.adminTenants()` 全件 fetch → `DataTable` (クライアント検索/ソート)
- Suspend/Activate ボタン: `confirm` ダイアログ → `api.suspendTenant` / `api.activateTenant`
- MFA Required トグル: `api.updateTenant(tid, { mfa_required, mfa_grace_days })`
  - 有効化時は `mfa_grace_days: 7` を設定

#### Members (`/members`)
- `tenantId = user?.tenantId` を使用
- `usePaginatedQuery(api.listMembers(tenantId, params), { defaultSize: 20 })`
- ロール色分け: OWNER=yellow / ADMIN=blue / MEMBER=green / VIEWER=gray

#### Invitations (`/invitations`)
- `statusFilter` (PENDING/USED/EXPIRED) をクエリに合成
- "Create Invitation" → `prompt()` でメールと role 入力 → `api.createInvitation`

#### Sessions (`/sessions`)
- `usePaginatedQuery(api.listSessions, { defaultSize: 20 })`
- "Revoke" ボタン → `api.revokeSession(id)` → リフレッシュ

#### Audit (`/audit`)
- `DateRangeFilter` (1h/24h/7d/30d クイック + datetime-local) + イベント種別 `<select>`
- フィルター合成: `{ ...params, from, to, event }`
- デフォルト pageSize: 50

#### IdpConfig (`/idp`)
- `api.listIdpConfigs(tenantId)` 全件 fetch → `DataTable` (read-only)
- 設定が 0 件の場合: "Global providers (Google, GitHub) are configured via volta-config.yaml." を表示

#### Webhooks (`/webhooks`)
- CRUD: Create / Edit (inline form) / Delete / Toggle active
- 配信履歴: "History" ボタンで `api.listWebhookDeliveries(tid, wid)` を遅延取得
  → 展開パネルに最大 64px スクロール付きリスト表示
- フォームフィールド: `endpoint_url` (URL 型, required), `events` (カンマ区切り)

#### SigningKeys (`/keys`)
- `api.listKeys()` 全件 fetch
- "Rotate Key" ボタン: `confirm` ダイアログ → `api.rotateKeys()`
- ステータス色: ACTIVE=green / ROTATED=yellow / REVOKED=red

#### Settings (`/settings`)
- Profile セクション: `displayName` 編集 → `PATCH /api/v1/users/:id`
- MFA セクション: `GET /api/v1/users/me/mfa` → TOTP 有効状態・setup 日・回復コード残数
- Sessions セクション: `api.mySessions()` → 各セッションに Revoke ボタン

#### Monitor (`/monitor`)
- 管理者専用 (Sidebar フィルター)
- `TRAMLI_VIZ_AVAILABLE = true` (定数) により VizDashboard を常に有効化
- `VizDashboard` は `lazy()` + `Suspense` で dynamic import
- SSE: `EventSource('/viz/auth/stream', { withCredentials: true })`
  - `auth-event` イベントを購読 → `MAX_FEED_EVENTS = 200` 件上限の逆順リスト
  - イベント種別でバッジ色分け (green/red/blue/purple/yellow/gray)
- フロー定義: `GET /viz/flows` → `{ flows: [{name, mermaid}] }` を取得しカード表示
  - 取得失敗は soft-fail (エンドポイント不在を許容)
- Flow カード: FLOW_NAMES = ['session', 'oidc', 'passkey', 'mfa', 'invite']
- VizDashboard props: `wsUrl=/viz/ws (ws/wss 自動判定)`, `layout="layered"`, `theme="dark"`,
  `showMetrics`, `showCarPool`, `showReplay`

---

## 3. データ永続化層

### 3.1 Zustand Store (`src/store/authStore.js`)

```
useAuthStore {
  user: null | UserObject
  tenants: TenantObject[]
  loading: boolean          // 初期: true
  error: string | null
  authenticated: boolean    // 初期: false

  init()                   // Legacy: 直接 API call (tramli 非使用時 fallback)
  setAuth(user, tenants)   // tramli AUTHENTICATED → zustand 同期
  setUnauthenticated(msg)  // tramli NO_SESSION → zustand 同期
}
```

### 3.2 API クライアント (`src/lib/api.js`)

- ベースパス: `/api/v1`
- 共通オプション: `credentials: 'include'`, `Content-Type: application/json`
- 401 → `throw new Error('Unauthorized')`
- 非 ok → `res.json()` → `err.detail || err.error?.message || "HTTP {status}"`
- `items(path)`: レスポンスの `.items` フィールドを優先返却
- `paginated(path, params)`: `buildQuery` でクエリ文字列を付与して `request`

#### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/v1/users/me` | 自分のユーザー情報 |
| GET | `/api/v1/users/me/tenants` | 所属テナント一覧 |
| GET | `/api/v1/admin/users[?params]` | ユーザー一覧 (管理) |
| GET | `/api/v1/tenants/:tid` | テナント詳細 |
| GET | `/api/v1/admin/tenants` | テナント一覧 (管理) |
| POST | `/api/v1/admin/tenants/:tid/suspend` | テナント停止 |
| POST | `/api/v1/admin/tenants/:tid/activate` | テナント有効化 |
| PATCH | `/api/v1/tenants/:tid` | テナント更新 |
| GET | `/api/v1/tenants/:tid/members[?params]` | メンバー一覧 |
| PATCH | `/api/v1/tenants/:tid/members/:mid` | メンバー更新 |
| GET | `/api/v1/tenants/:tid/invitations[?params]` | 招待一覧 |
| POST | `/api/v1/tenants/:tid/invitations` | 招待作成 |
| DELETE | `/api/v1/tenants/:tid/invitations/:iid` | 招待削除 |
| GET | `/api/v1/admin/sessions[?params]` | セッション一覧 (管理) |
| GET | `/api/me/sessions` | 自分のセッション一覧 (**注意: `/api/me/` プレフィックス**) |
| DELETE | `/auth/sessions/:id` | セッション失効 (**注意: `/auth/` プレフィックス**) |
| GET | `/api/v1/admin/audit[?params]` | 監査ログ (管理) |
| GET | `/api/v1/tenants/:tid/idp-configs` | IdP 設定一覧 |
| GET | `/api/v1/tenants/:tid/webhooks` | Webhook 一覧 |
| POST | `/api/v1/tenants/:tid/webhooks` | Webhook 作成 |
| PATCH | `/api/v1/tenants/:tid/webhooks/:wid` | Webhook 更新 |
| DELETE | `/api/v1/tenants/:tid/webhooks/:wid` | Webhook 削除 |
| GET | `/api/v1/tenants/:tid/webhooks/:wid/deliveries` | 配信履歴 |
| DELETE | `/api/v1/tenants/:tid/members/:uid/mfa` | MFA リセット (管理) |
| GET | `/api/v1/admin/keys` | 署名鍵一覧 |
| POST | `/api/v1/admin/keys/rotate` | 署名鍵ローテーション |

### 3.3 usePaginatedQuery フック (`src/hooks/usePaginatedQuery.js`)

URL SearchParams ベースのサーバーサイドページネーションフック。
`useSearchParams` と連携し、ページ/サイズ/ソート/検索を URL に同期する。

```
params: { page, size, sort?, q?, ...filters }
response: { items[], total, page, size, pages }
```

- `setSearch`: 300ms デバウンス付き
- `setSearchImmediate`: デバウンスなし (Enter/Escape キー)
- `refresh()`: 現在パラメータで再取得
- `setFilters`: 追加フィルター (Audit の `event`, Invitations の `status` 等)

---

## 4. ステートマシン

### 4.1 OIDC 認証フロー (`authFlowDefinition`)

`src/store/authFlowDefinition.js` に `@unlaxer/tramli` で定義。
Java 版 volta-auth-proxy の `AuthState` と対称設計。

```
フロー名: "volta-auth-oidc"
TTL: 10 分
maxGuardRetries: 3
strictMode: true
```

#### 10 状態

| 状態 | 種別 | 説明 |
|------|------|------|
| `UNAUTHENTICATED` | initial | 未認証 (エントリポイント) |
| `LOGIN_REDIRECT` | intermediate | ログインURL 構築済み |
| `LOGIN_PENDING` | intermediate | IdP リダイレクト済み・コールバック待ち |
| `CALLBACK_RECEIVED` | intermediate | IdP コールバック受信 |
| `USER_RESOLVED` | intermediate | ユーザー情報取得完了 |
| `MFA_PENDING` | intermediate | MFA 認証待ち |
| `SESSION_CREATED` | intermediate | セッション確立 |
| `COMPLETE` | terminal | 認証完了 |
| `FAILED` | terminal | エラー終了 |
| `EXPIRED` | terminal | TTL 超過 |

#### 遷移グラフ

```
UNAUTHENTICATED --[auto: LoginRedirectInit]--> LOGIN_REDIRECT
LOGIN_REDIRECT  --[auto: RedirectToLogin]---> LOGIN_PENDING
LOGIN_PENDING   --[external: IdpCallbackGuard]--> CALLBACK_RECEIVED
CALLBACK_RECEIVED --[auto: ResolveUser]------> USER_RESOLVED
USER_RESOLVED   --[branch: MfaCheck]
                    "no_mfa"  --> SESSION_CREATED (via SessionCreator)
                    "mfa_required" --> MFA_PENDING
MFA_PENDING     --[external: MfaVerifyGuard + SessionCreator]--> SESSION_CREATED
SESSION_CREATED --[auto: FinalRedirect]------> COMPLETE
any             --[onAnyError]---------------> FAILED
```

#### FlowKey (コンテキストキー)

| キー | 型 | 説明 |
|------|-----|------|
| `RequestOrigin` | `auth.request_origin` | `{ returnTo: string }` |
| `AuthConfig` | `auth.config` | 認証設定オブジェクト |
| `LoginRedirect` | `auth.login_redirect` | `{ url: string }` |
| `IdpCallback` | `auth.idp_callback` | `{ code, state }` |
| `ResolvedUser` | `auth.resolved_user` | ユーザーオブジェクト |
| `MfaResult` | `auth.mfa_result` | `{ verified: boolean }` |
| `SessionCookie` | `auth.session_cookie` | `{ active: boolean }` |
| `FinalRedirect` | `auth.final_redirect` | `{ url: string }` |
| `UserTenants` | `auth.user_tenants` | テナント配列 |

#### Guards

- **IdpCallbackGuard**: URL クエリに `?code=&state=` があれば `accepted`
  → `IdpCallback` にセット。maxRetries: 1
- **SessionCheckGuard**: `api.me()` 成功で `accepted`
  → `IdpCallback` + `ResolvedUser` に直接セット (OIDC スキップ用)
- **MfaVerifyGuard**: `MfaResult?.verified === true` で `accepted`。maxRetries: 3

#### Processors

- **LoginRedirectInit**: `RequestOrigin.returnTo` → `/login?return_to=...` URL 構築
- **RedirectToLogin**: noop (UI 側がリダイレクト実行)
- **ResolveUser**: `api.me()` → `ResolvedUser` セット
- **SessionCreator**: `api.myTenants()` → `UserTenants` + `SessionCookie` + `FinalRedirect` セット
- **FinalRedirect**: noop (UI 側が COMPLETE 表示に切り替え)

### 4.2 セッション再接続フロー (`sessionResumeDefinition`)

```
フロー名: "session-resume"
TTL: 30 秒
strictMode: true
```

#### 3 状態

| 状態 | 種別 | 説明 |
|------|------|------|
| `CHECKING` | initial | セッション確認中 |
| `AUTHENTICATED` | terminal | セッション有効 |
| `NO_SESSION` | terminal | セッション無効 |

#### 遷移

```
CHECKING --[external: SessionResumeGuard]--> AUTHENTICATED
         --[onAnyError]--------------------> NO_SESSION
```

**SessionResumeGuard**: `Promise.all([api.me(), api.myTenants()])` 成功で `accepted`
→ `ResumeUser` + `ResumeTenants` をコンテキストにセット。maxRetries: 1

### 4.3 useAuthFlow フック (`src/hooks/useAuthFlow.js`)

`sessionResumeDefinition` を `useFlow()` で起動。
- `AUTHENTICATED` かつ `ResumeUser` 取得済み → `authStore.setAuth(user, tenants)`
- `NO_SESSION` → `authStore.setUnauthenticated(error.message)`
- `synced` ref で二重実行を防止

---

## 5. ビジネスロジック

### 5.1 Monitor ページ — tramli-viz フラグ

```js
// src/pages/Monitor.jsx
const TRAMLI_VIZ_AVAILABLE = true;
```

この定数が `true` の場合、`@unlaxer/tramli-viz` の `VizDashboard` コンポーネントを
`lazy()` + `Suspense` で動的ロードし、Monitor ページ下部に表示する。

`false` に変更すると VizDashboard はレンダリングされない (フィーチャーフラグとして機能)。
`TRAMLI_VIZ_AVAILABLE = false` の場合、`VizDashboardLazy` は `null` になり
`{TRAMLI_VIZ_AVAILABLE && VizDashboardLazy && ...}` の条件が false になる。

VizDashboard の WebSocket URL は実行時にホスト名から動的解決:
```js
function resolveVizWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/viz/ws`;
}
```

### 5.2 nginx バックエンド IP

`nginx.conf` では volta-auth-proxy のバックエンドアドレスを固定 IP で指定している:

```nginx
proxy_pass http://192.168.1.13:7070;
```

この IP はローカルネットワーク内の固定アドレス。本番・開発環境で変更が必要な場合は
`nginx.conf` を直接編集するか、環境変数による動的設定の仕組みを導入する必要がある。
対象ロケーション: `/api/`, `/auth/`, `/.well-known/`

### 5.3 Dashboard 全件 fetch 問題

Dashboard は統計値を計算するために全件取得 API を呼び出す:

```js
Promise.all([
  api.listUsers(),     // ページネーションなし → 全件
  api.adminTenants(),  // 全件
  api.listAudit(),     // 全件
])
```

大規模環境ではパフォーマンス問題が発生しうる。
サーバー側に集計 API (`/admin/stats` 等) を追加することが望ましい。

### 5.4 Audit イベント種別フィルター

`setFilters` は `Audit.jsx` で呼ばれるが、`usePaginatedQuery` では
`fetchFn` の `useCallback` 依存配列に `statusFilter` / `dateRange` を含めることで
フィルター変更時に `fetchFn` 自体が再生成され、再 fetch が発生する設計になっている。

---

## 6. API / 外部境界

### 6.1 プレフィックス混在

| プレフィックス | 用途 | 例 |
|--------------|------|-----|
| `/api/v1/` | 主要管理 API | `/api/v1/admin/users` |
| `/api/me/` | ユーザー自身リソース | `/api/me/sessions` |
| `/auth/` | 認証操作 | `/auth/sessions/:id` (DELETE) |
| `/viz/` | Monitor ページ専用 | `/viz/auth/stream` (SSE), `/viz/flows`, `/viz/ws` (WS) |

`/api/me/sessions` と `/auth/sessions/:id` は `api.js` の共通 `request()` を
使用せず直接 `fetch()` を呼んでいる。これは API 境界の非統一を意味する。

### 6.2 Vite dev proxy

開発時は Vite の `server.proxy` が以下を `http://localhost:7070` に転送:

```
/api, /auth, /login, /callback, /select-tenant, /healthz, /.well-known, /css, /js
```

`/viz/` は Vite proxy に含まれていない点に注意
(Monitor ページの SSE・WS は開発環境では直接接続が必要)。

### 6.3 Settings ページの直接 fetch

`Settings.jsx` は以下を直接 `fetch()` で呼ぶ:
- `GET /api/v1/users/me/mfa` — MFA 状態取得
- `PATCH /api/v1/users/:id` — displayName 更新

これらは `api.js` に統合されていない。

---

## 7. UI

### 7.1 全体レイアウト

```
<div class="min-h-screen bg-gray-950 flex">
  <Sidebar />                     w-56, bg-gray-900
  <main class="flex-1 p-6">      各ページコンポーネント
```

ダークテーマ固定 (`bg-gray-950` ベース)。

### 7.2 コンポーネント一覧

| コンポーネント | ファイル | 説明 |
|-------------|---------|------|
| `Sidebar` | `components/Sidebar.jsx` | NavLink 一覧、admin フィルター |
| `DataTable` | `components/DataTable.jsx` | クライアントサイド検索/ソート/ページング |
| `ServerDataTable` | `components/ServerDataTable.jsx` | サーバーサイドページング対応テーブル |
| `AuthFlowStatus` | `components/AuthFlowStatus.jsx` | tramli 状態のバッジ表示 |
| `DateRangeFilter` | `components/DateRangeFilter.jsx` | クイック範囲 + datetime-local 入力 |

### 7.3 DataTable vs ServerDataTable

| 項目 | DataTable | ServerDataTable |
|------|-----------|-----------------|
| データ取得 | props で全件渡す | `usePaginatedQuery` 経由 |
| 検索 | クライアント側フィルター | サーバーへクエリ送信 |
| ソート | クライアント側 | `sort` パラメータをサーバーへ送信 |
| ページング | クライアント側スライス | サーバーレスポンスの `page/pages/total` |
| URL 同期 | なし | `useSearchParams` と同期 |
| 使用画面 | Tenants, IdpConfig, Webhooks, SigningKeys | Users, Members, Invitations, Sessions, Audit |

### 7.4 Tailwind クラス規約

- 背景: `bg-gray-950` (ベース), `bg-gray-900` (カード/サイドバー), `bg-gray-800` (行 hover/入力)
- テキスト: `text-white` (見出し), `text-gray-300` (本文), `text-gray-400/500/600` (補助)
- ボーダー: `border-gray-700` (入力), `border-gray-800` (行区切り)
- アクション色: `bg-blue-600` (primary), `bg-red-900/50` (danger), `bg-green-900/50` (success)

### 7.5 各画面の詳細 UI

#### Dashboard
- 4 列グリッド (`grid-cols-2 lg:grid-cols-4`)
- カード: `bg-gray-800 rounded-lg p-5 border border-gray-700`
- 数値色: blue/green/purple/red (カード種別に対応)

#### ServerDataTable 共通構造
- 検索ボックス (`w-64`) + extraFilters スロット + ページサイズ選択
- ローディングオーバーレイ: `absolute inset-0 bg-gray-950/50`
- ページネーション: 最大 5 ページボタン + `...` 省略 + 前後ボタン

#### Monitor
- 接続状態ドット: 緑 (connected) / 赤 (error) / グレー (disconnected)
- フローカード: 3 列グリッド (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Live feed: 最新順、最大 200 件、`max-h-96` スクロール

---

## 8. 設定

### 8.1 nginx.conf

本番デプロイ用 nginx 設定。Vite ビルド成果物を `/usr/share/nginx/html` に配置する。

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API プロキシ
    location /api/ {
        proxy_pass http://192.168.1.13:7070;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth/ {
        proxy_pass http://192.168.1.13:7070;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /.well-known/ {
        proxy_pass http://192.168.1.13:7070;
        proxy_set_header Host $host;
    }
}
```

**注意**: `/viz/` ロケーションが未定義のため、Monitor ページの
`/viz/auth/stream` (SSE), `/viz/flows`, `/viz/ws` は本番環境でプロキシされない。
Monitor 機能を本番で使用するには `/viz/` ロケーションを追加する必要がある。

### 8.2 vite.config.js

```js
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3400,
    allowedHosts: ['auth-console.unlaxer.org'],
    proxy: { /* ... */ }
  },
})
```

- `VITE_BASE_PATH` 環境変数でベースパスを変更可能
- 開発サーバーポート: 3400
- 許可ホスト: `auth-console.unlaxer.org`
- Tailwind は `@tailwindcss/vite` プラグイン経由で組み込み (PostCSS 不要)

---

## 9. 依存関係

### 9.1 dependencies (本番バンドル)

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `react` | ^19.2.4 | UI フレームワーク |
| `react-dom` | ^19.2.4 | DOM レンダリング |
| `@unlaxer/dxe-suite` | `file:../DxE-suite` | ローカルパッケージ (DxE UI suite) |
| `@unlaxer/tramli` | ^3.6.1 | フローエンジン |
| `@unlaxer/tramli-react` | ^0.2.0 | tramli React バインディング (`useFlow`) |
| `@unlaxer/tramli-viz` | ^0.2.0 | フロービジュアライザー (`VizDashboard`) |

### 9.2 devDependencies (ビルド時のみ)

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `vite` | ^8.0.1 | バンドラー・開発サーバー |
| `@vitejs/plugin-react` | ^6.0.1 | React Fast Refresh |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind CSS v4 統合 |
| `tailwindcss` | ^4.2.2 | CSS フレームワーク |
| `eslint` | ^9.39.4 | Lint |
| `react-router-dom` | ^7.14.0 | **[誤配置]** ルーティング |
| `zustand` | ^5.0.12 | **[誤配置]** 状態管理 |

### 9.3 依存関係の問題点

**react-router-dom** と **zustand** が `devDependencies` に配置されている。
これらはランタイムに必要なライブラリであり、`dependencies` に移動すべきである。

Vite はデフォルトで `devDependencies` もバンドルに含めるため、
`vite build` での動作には現状影響しないが、
他のツール (例: `npm pack`, Docker の `--production` インストール) では問題になる。

---

## 10. 非機能要件・既知の問題

### 10.1 Dashboard 全件 fetch (パフォーマンス)

**問題**: Dashboard が `listUsers()`, `adminTenants()`, `listAudit()` を
ページネーションなしで全件取得している。

**影響**: 大規模テナントでは初期ロードが遅くなる。
audit ログが大量にある場合、`listAudit()` のレスポンスが特に大きくなりうる。

**推奨**: バックエンドに `/api/v1/admin/stats` 等の集計 API を追加し、
Dashboard は集計値のみを取得する設計に変更する。

### 10.2 API 境界の非統一

3 種類のプレフィックス (`/api/v1/`, `/api/me/`, `/auth/`) が混在しており、
`api.js` の共通 `request()` ラッパーを通さない直接 `fetch()` 呼び出しが
`Sessions.jsx` (mySessions, revokeSession) と `Settings.jsx` に存在する。

**推奨**: `api.js` にすべての API 呼び出しを集約し、`request()` ラッパーを通す。

### 10.3 nginx の /viz/ 未定義

`nginx.conf` に `/viz/` ロケーションが存在しないため、
Monitor ページの SSE・REST・WS エンドポイントが本番環境でプロキシされない。

### 10.4 confirm/alert 使用

複数の操作確認が `confirm()` / `alert()` / `prompt()` ブラウザネイティブ API を使用している。
カスタムモーダルへの置き換えが望ましい。

対象:
- Tenants: suspend/activate/MFA toggle
- Users: MFA リセット
- Sessions: セッション失効
- SigningKeys: キーローテーション
- Webhooks: 削除
- Invitations: メール・ロール入力 (`prompt`)

### 10.5 エラーハンドリング

`api.js` の `request()` は 401 を検出して `throw` するが、
アプリケーション全体での 401 ハンドリング (ログインページへのリダイレクト) は実装されていない。
各ページは `catch(() => [])` / `catch(() => setData([]))` で個別に処理している。

### 10.6 MFA リセットの tenantId 取得

`Users.jsx` の `handleResetMfa` では `user?.tenantId` を使用するが、
管理者が複数テナントに属する場合、どのテナントの MFA をリセットするか
文脈が不明確になる可能性がある。

---

## 11. テスト戦略

現時点ではテストコードは存在しない。以下は推奨テスト構成である。

### 11.1 単体テスト (推奨)

| 対象 | テスト内容 |
|------|-----------|
| `authFlowDefinition.js` | 各状態遷移の正当性、Guard の accept/reject |
| `sessionResumeDefinition` | CHECKING → AUTHENTICATED / NO_SESSION |
| `usePaginatedQuery.js` | URL パラメータ同期、デバウンス動作 |
| `api.js` | 401 ハンドリング、エラーメッセージ抽出 |
| `DateRangeFilter.jsx` | クイック範囲ボタン、datetime-local 入力変換 |

### 11.2 統合テスト (推奨)

| 対象 | テスト内容 |
|------|-----------|
| `useAuthFlow` + `authStore` | AUTHENTICATED/NO_SESSION での zustand 同期 |
| Dashboard | stats カード値の正確な計算 |
| ServerDataTable + usePaginatedQuery | ページ変更・ソート変更での URL 更新と再取得 |

### 11.3 E2E テスト (推奨)

- ログイン → Dashboard 表示フロー
- ユーザー検索 → ページング → MFA リセット
- Webhook 作成 → 更新 → 削除
- Monitor ページ SSE 接続・イベント受信

### 11.4 テスト環境

推奨ツール:
- **単体/統合**: Vitest + @testing-library/react
- **E2E**: Playwright

---

## 12. デプロイ / 運用

### 12.1 ビルド

```bash
npm run build
# dist/ ディレクトリに成果物が生成される
```

`VITE_BASE_PATH` 環境変数でデプロイ先のベースパスを指定できる:

```bash
VITE_BASE_PATH=/console npm run build
```

### 12.2 Docker デプロイ (推奨構成)

```dockerfile
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 12.3 nginx 設定の更新要件

本番デプロイ前に `nginx.conf` の以下を確認・更新:

1. `proxy_pass http://192.168.1.13:7070` → 実際のバックエンドアドレスに変更
2. `/viz/` ロケーションの追加 (Monitor ページを使用する場合):

```nginx
location /viz/ {
    proxy_pass http://192.168.1.13:7070;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600;   # SSE/WS 用に長めに設定
}
```

### 12.4 開発環境起動

```bash
# 依存インストール
npm install

# 開発サーバー起動 (port 3400)
npm run dev

# volta-auth-proxy が localhost:7070 で起動している必要がある
```

### 12.5 環境変数

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `VITE_BASE_PATH` | `/` | Vite ビルドのベースパス |
| `NODE_OPTIONS` | `--max-http-header-size=65536` | `npm run dev` 時に自動設定 |

### 12.6 バージョン管理

現在のバージョン: **0.2.0** (package.json および Sidebar フッターに表示)

変更履歴は `CHANGELOG.md` を参照。
アーキテクチャ詳細は `docs/architecture.md` / `docs/architecture-ja.md` を参照。
ページ仕様詳細は `docs/pages.md` / `docs/pages-ja.md` を参照。
Monitor ページ詳細は `docs/monitor-page.md` / `docs/monitor-page-ja.md` を参照。

---

## 付録 A: コンポーネント詳細リファレンス

### A.1 Sidebar コンポーネント

**ファイル**: `src/components/Sidebar.jsx`

```jsx
export default function Sidebar({ user })
```

**Props**:
- `user`: `useAuthStore(s => s.user)` から渡される認証済みユーザーオブジェクト

**レンダリング条件**:
- `link.admin === true` のリンクは `role === 'ADMIN' || role === 'OWNER'` のときのみ表示
- 現在、`admin: true` フラグを持つのは **Monitor** のみ

**NavLink アクティブスタイル**:
- アクティブ時: `bg-gray-800 text-white`
- 非アクティブ時: デフォルト (hover で `bg-gray-800`)
- `end={to === '/'}` によりルートパスの完全一致を強制

**フッター**:
```
volta-auth-console v0.2.0
```
バージョン文字列は手動管理 (package.json との自動同期なし)。

---

### A.2 DataTable コンポーネント

**ファイル**: `src/components/DataTable.jsx`

```jsx
export default function DataTable({ columns, data, searchKeys = [], pageSize = 20 })
```

**Props**:
| prop | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `columns` | `Column[]` | 必須 | カラム定義配列 |
| `data` | `object[]` | 必須 | 全件データ |
| `searchKeys` | `string[]` | `[]` | 検索対象フィールド名 |
| `pageSize` | `number` | `20` | 1 ページあたりの行数 |

**Column 型**:
```ts
{
  key: string;          // data オブジェクトのフィールド名
  label: string;        // ヘッダー表示文字列
  render?: (value, row) => ReactNode;  // カスタムレンダラー
}
```

**動作**:
1. `search` 文字列で `searchKeys` フィールドを大文字小文字無視でフィルター
2. `sortCol` / `sortDir` で `localeCompare` ソート
3. `page * pageSize` でスライス → テーブル表示
4. `totalPages > 1` の場合のみページネーションコントロール表示

**クライアントソート**:
- ヘッダークリックで同一カラムならディレクション反転
- 異なるカラムクリックで昇順リセット
- ソートインジケーター: `▲` (asc) / `▼` (desc)

---

### A.3 ServerDataTable コンポーネント

**ファイル**: `src/components/ServerDataTable.jsx`

```jsx
export default function ServerDataTable({
  columns, data, page, pages, total, size, sort, search,
  isLoading, onPageChange, onSortChange, onSearchChange,
  onSearchSubmit, onSizeChange,
  searchPlaceholder, showSearch, extraFilters
})
```

**Props**:
| prop | 型 | 説明 |
|------|----|------|
| `columns` | `Column[]` | カラム定義 (`sortable?: false` でソート無効) |
| `data` | `object[]` | 現在ページのデータ |
| `page` | `number` | 現在ページ (1 始まり) |
| `pages` | `number` | 総ページ数 |
| `total` | `number` | 総件数 |
| `size` | `number` | ページサイズ |
| `sort` | `string` | ソートキー (`-` プレフィックスで降順) |
| `isLoading` | `boolean` | ローディングオーバーレイ表示フラグ |
| `onPageChange` | `(page) => void` | ページ変更コールバック |
| `onSortChange` | `(sort) => void` | ソート変更コールバック |
| `onSearchChange` | `(q) => void` | 検索文字列変更 (デバウンス用) |
| `onSearchSubmit` | `(q) => void` | 検索確定 (Enter/Escape キー) |
| `onSizeChange` | `(size) => void` | ページサイズ変更 |
| `extraFilters` | `ReactNode` | 追加フィルター UI スロット |
| `showSearch` | `boolean` | 検索ボックス表示フラグ (default: true) |

**ソートパラメータ形式**:
```
"email"    → key=email, dir=asc
"-email"   → key=email, dir=desc
```

**検索入力の挙動**:
- 通常入力 → `onSearchChange` (デバウンスは `usePaginatedQuery` 側で処理)
- Enter → `onSearchSubmit` (即時確定)
- Escape → `searchInput` を空にし `onSearchSubmit('')` 呼び出し

**外部 search prop 変更時の同期**:
`search !== lastSyncedSearch` の条件で `searchInput` を derived state パターンで更新。
これにより ブラウザ戻るボタン操作でも検索ボックスが正しい状態を保つ。

**内部 Pagination サブコンポーネント**:
- `pages <= 1` の場合は非表示
- 最大 5 ページボタンを表示、前後に `...` で省略
- 現在ページは `bg-blue-600 text-white` でハイライト
- "Showing {from}-{to} of {total}" テキストを左に表示

**ローディングオーバーレイ**:
```
position: absolute, inset: 0
bg-gray-950/50 (半透明マスク)
"Loading..." テキストを中央表示
```

---

### A.4 AuthFlowStatus コンポーネント

**ファイル**: `src/components/AuthFlowStatus.jsx`

```jsx
export default function AuthFlowStatus({ state, error })
```

全 tramli 状態のラベル・色マッピングを保持する表示専用コンポーネント。
Dashboard の右上に固定表示 (`state="AUTHENTICATED"` を props で渡している)。

**状態ラベル対応表**:

| state | label | color |
|-------|-------|-------|
| CHECKING | Checking session... | yellow-400 |
| AUTHENTICATED | Authenticated | green-400 |
| NO_SESSION | No session | gray-400 |
| UNAUTHENTICATED | Not authenticated | gray-400 |
| LOGIN_REDIRECT | Redirecting to IdP... | blue-400 |
| LOGIN_PENDING | Waiting for login... | blue-400 |
| CALLBACK_RECEIVED | Processing callback... | blue-400 |
| USER_RESOLVED | User verified | green-400 |
| MFA_PENDING | MFA required | yellow-400 |
| SESSION_CREATED | Session created | green-400 |
| COMPLETE | Complete | green-400 |
| FAILED | Failed | red-400 |
| EXPIRED | Session expired | red-400 |

---

### A.5 DateRangeFilter コンポーネント

**ファイル**: `src/components/DateRangeFilter.jsx`

```jsx
export default function DateRangeFilter({ from, to, onChange })
```

**Props**:
| prop | 型 | 説明 |
|------|----|------|
| `from` | `string \| null` | 開始日時 (ISO 8601) |
| `to` | `string \| null` | 終了日時 (ISO 8601) |
| `onChange` | `({ from, to }) => void` | 変更コールバック |

**クイック範囲ボタン**:
| ラベル | 期間 |
|--------|------|
| 1h | 1 時間前から現在 |
| 24h | 24 時間前から現在 |
| 7d | 7 日前から現在 |
| 30d | 30 日前から現在 |

`toLocalDatetime(date)` 関数で ISO 文字列 → `datetime-local` 入力形式に変換:
```
YYYY-MM-DDTHH:mm
```

"Clear" ボタンは `from || to` のいずれかが存在する場合のみ表示。
クリック時は `onChange({ from: null, to: null })` を呼ぶ。

---

## 付録 B: ページ詳細リファレンス

### B.1 Dashboard ページ

**ファイル**: `src/pages/Dashboard.jsx`

**初期ロードシーケンス**:
```
1. App.jsx の useAuthFlow() がセッション確認
2. AUTHENTICATED → authStore.setAuth(user, tenants)
3. Dashboard の useEffect が user の変化を検知
4. Promise.all([listUsers, adminTenants, listAudit]) を並列実行
5. 結果を stats ステートにセット → カード再描画
```

**stats オブジェクト構造**:
```ts
{
  totalUsers: number;     // listUsers().length
  totalTenants: number;   // adminTenants().length
  recentLogins: number;   // audit.filter(a => a.event === 'LOGIN_SUCCESS').length
  recentErrors: number;   // audit.filter(a => a.event?.startsWith('ERROR')).length
}
```

**ローディング状態**:
- `stats === null` の間: `<div class="text-gray-400 p-8">Loading...</div>` を表示
- `user === null` の場合: useEffect 内の `if (!user) return` で fetch をスキップ

---

### B.2 Users ページ

**ファイル**: `src/pages/Users.jsx`

**カラム定義**:
| key | label | render |
|-----|-------|--------|
| `email` | Email | デフォルト |
| `displayName` | Name | デフォルト |
| `mfaEnabled` | MFA | `true` → `🔒` / `false` → `—` |
| `active` | Status | `true` → `🟢` / `false` → `🔴` |
| `createdAt` | Created | `new Date(v).toLocaleString('ja-JP')` |
| `_actions` | (空) | MFA 有効時のみ "Reset MFA" ボタン |

**MFA リセット処理**:
```
1. confirm() でユーザー確認
2. api.adminResetMfa(user?.tenantId, userId)
3. pq.refresh() でリスト再取得
4. エラー時は alert(err.message)
```

---

### B.3 Tenants ページ

**ファイル**: `src/pages/Tenants.jsx`

**MFA grace period**:
MFA を有効化する際、`mfa_grace_days: 7` を一緒に送信する。
これにより既存メンバーは 7 日間の猶予期間が与えられる。
バックエンドがこの値をどのように処理するかは volta-auth-proxy の仕様に依存する。

**カラム定義**:
| key | label | 説明 |
|-----|-------|------|
| `name` | Name | テナント名 |
| `slug` | Slug | URL スラグ |
| `plan` | Plan | プラン名 |
| `mfaRequired` | MFA | トグルボタン (Required/Optional) |
| `memberCount` | Members | メンバー数 |
| `suspended` | Status | トグルボタン (Suspended/Active) |

---

### B.4 Members ページ

**ファイル**: `src/pages/Members.jsx`

**tenantId の取得**:
`user?.tenantId` を使用。`tenantId` が `null` の場合、
fetchMembers は `{ items: [], total: 0, page: 1, size: 20, pages: 0 }` を即返す。

**ロール表示**:
```
OWNER  → text-yellow-400
ADMIN  → text-blue-400
MEMBER → text-green-400
VIEWER → text-gray-400
```

**userId 表示**:
`v?.slice(0, 8)` で先頭 8 文字のみ表示 (font-mono)。

---

### B.5 Invitations ページ

**ファイル**: `src/pages/Invitations.jsx`

**ステータスフィルター**:
`statusFilter` は `useCallback` の依存配列に含まれているため、
フィルター変更で `fetchInvitations` が再生成され、`usePaginatedQuery` が再 fetch する。

**招待作成フォーム** (prompt ベース):
```
1. prompt('Restrict to email (leave empty for any):')
   → email が空の場合は undefined として送信
2. prompt('Role (MEMBER/ADMIN):', 'MEMBER')
   → キャンセル時は role === null → 処理中断
3. api.createInvitation(tenantId, { email: email || undefined, role })
```

**コード表示**:
`v?.slice(0, 12) + '...'` で先頭 12 文字 + "..." 表示。

---

### B.6 Sessions ページ

**ファイル**: `src/pages/Sessions.jsx`

**カラム定義**:
| key | label | render |
|-----|-------|--------|
| `email` | Email | デフォルト |
| `displayName` | Name | デフォルト |
| `device` | Device | `v \|\| userAgent.substring(0, 40)` |
| `ip` | IP | `v \|\| row.ipAddress \|\| row.ip_address \|\| '-'` |
| `lastActive` | Last Active | `new Date(v \|\| row.last_active_at).toLocaleString('ja-JP')` |
| `_actions` | (空) | "Revoke" ボタン |

**フィールド名の正規化**:
API レスポンスのフィールド名が `camelCase` / `snake_case` で揺れている可能性を考慮し、
複数の候補キーを `||` でフォールバックしている。

---

### B.7 Audit ページ

**ファイル**: `src/pages/Audit.jsx`

**イベント種別**:
```
LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ERROR_AUTH, ERROR_MFA, MFA_ENROLLED, MFA_VERIFIED
```

**イベント色分け**:
- `v?.startsWith('ERROR')` → `text-red-400`
- `v?.includes('SUCCESS')` → `text-green-400`
- その他 → `text-gray-300`

**フィルター合成ロジック**:
```js
const fetchAudit = useCallback((params) => {
  const merged = { ...params };
  if (dateRange.from) merged.from = dateRange.from;
  if (dateRange.to) merged.to = dateRange.to;
  if (eventFilter) merged.event = eventFilter;
  return api.listAudit(merged);
}, [dateRange, eventFilter]);
```

`handleEventChange` では `pq.setFilters` も呼んでいるが、
`fetchAudit` 自体が `useCallback` の依存で再生成されるため、
`setFilters` は実質的には冗長になっている可能性がある (二重 fetch の可能性)。

---

### B.8 IdpConfig ページ

**ファイル**: `src/pages/IdpConfig.jsx`

**read-only**: 現在、IdP 設定の作成・編集・削除機能は実装されていない。
テナント独自の IdP 設定のみ表示する。グローバル設定 (Google, GitHub 等) は
`volta-config.yaml` で管理されるためここには表示されない。

**カラム定義**:
| key | label | render |
|-----|-------|--------|
| `id` | ID | デフォルト |
| `type` | Type | `<span class="font-mono">` |
| `issuer` | Issuer | デフォルト |
| `enabled` | Status | `true` → `🟢 Enabled` / `false` → `🔴 Disabled` |

---

### B.9 Webhooks ページ

**ファイル**: `src/pages/Webhooks.jsx`

**状態管理**:
```ts
webhooks: WebhookObject[]
loading: boolean
showForm: boolean               // フォーム表示フラグ
editing: WebhookObject | null   // 編集中の Webhook (null = 新規)
form: { endpoint_url: string, events: string }
saving: boolean
deliveries: Record<webhookId, DeliveryObject[]>
expandedId: string | null       // 展開中の配信履歴
```

**配信履歴の遅延取得**:
"History" ボタン初回クリック時のみ `api.listWebhookDeliveries` を呼ぶ。
取得済みの場合は `deliveries[row.id]` をキャッシュとして利用する。
`expandedId === row.id` の場合は閉じる動作になる。

**フォームの送信処理**:
```
editing !== null → api.updateWebhook(tid, editing.id, form)
editing === null → api.createWebhook(tid, form)
```

**エンドポイント URL のフィールド名揺れ**:
handleEdit で `wh.endpointUrl || wh.endpoint_url || wh.url` を参照。

---

### B.10 SigningKeys ページ

**ファイル**: `src/pages/SigningKeys.jsx`

**データ正規化**:
```js
api.listKeys().then(k => setKeys(Array.isArray(k) ? k : k.keys || []))
```
配列直接返却と `{ keys: [...] }` ラッパー両方に対応。

**キーローテーションの注意事項**:
confirm ダイアログには "Active JWTs will still be valid until expiry." と
明示されており、ローテーション後も既存の JWT は有効期限まで有効。

---

### B.11 Settings ページ

**ファイル**: `src/pages/Settings.jsx`

**Profile セクション**:
- 初期値: `useAuthStore(s => s.user)` の `displayName` をセット
- マウント時に `api.me()` を再度呼び最新値に更新
- 保存: `PATCH /api/v1/users/${user.userId || user.id}` に `{ display_name: displayName }`
  (フィールド名が `userId` / `id` で揺れる可能性を考慮)

**MFA セクション**:
- `GET /api/v1/users/me/mfa` → `{ totp: { enabled, setupAt }, recovery_codes_remaining }`
- TOTP 無効時または MFA 管理 URI: `/settings/security` (volta-auth-proxy のセキュリティ設定ページ)

**Sessions セクション**:
- `api.mySessions()` → `GET /api/me/sessions` → セッション一覧
- セッション失効後は `setSessions(s => s.filter(x => x.id !== session.id))` でローカル更新
  (再 fetch しない)

---

### B.12 Monitor ページ

**ファイル**: `src/pages/Monitor.jsx`

**コンポーネント構造**:
```
Monitor()          — デフォルトエクスポート (MonitorView のラッパー)
  └── MonitorView()  — 実際のロジックとレイアウト
        ├── FlowCard()   — 各フロー定義カード
        └── LiveFeed()   — リアルタイムイベントリスト
```

**SSE イベント処理**:
```js
es.addEventListener('auth-event', handleEvent);
es.addEventListener('connected', () => setStatus('connected'));
```

`auth-event` の payload 構造 (期待値):
```ts
{
  type: string;       // 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'MFA' | 'SESSION_EXPIRED' | ...
  ts: number;         // タイムスタンプ (ms)
  email?: string;     // アクターメール
  userId?: string;    // アクターユーザーID
  sessionId?: string; // セッションID
}
```

**per-flow カウント集計ロジック**:
```js
for (const name of FLOW_NAMES) {
  if (type.includes(name) ||
      (name === 'session' && (type.includes('login') || type.includes('logout') || type.includes('session')))) {
    copy[name] = (copy[name] || 0) + 1;
  }
}
```
`type` を小文字化してフロー名との部分一致で振り分け。
`session` フローは login/logout/session すべてをカウントする特例処理がある。

**VizDashboard dynamic import**:
```js
const VizDashboardLazy = TRAMLI_VIZ_AVAILABLE
  ? lazy(() => import('@unlaxer/tramli-viz').then(m => ({ default: m.VizDashboard })))
  : null;
```
`m.VizDashboard` を `{ default: ... }` 形式に変換して `lazy()` に渡している。
これは `@unlaxer/tramli-viz` が named export のみを持つため。

**タイムスタンプ表示**:
```js
function formatTs(tsMs) {
  const d = new Date(Number(tsMs));
  return d.toTimeString().slice(0, 8); // "HH:mm:ss"
}
```

**FlowCard のフォールバック**:
`mermaid` データが取得できていない場合 (API 未実装など)、
"Flow definition pending" テキストを点線ボーダーの枠で表示する。
mermaid のレンダリングはせず、ソースを `<pre>` タグで表示するのみ。
tramli-viz が利用可能になれば VizDashboard がこれを置き換える設計。

---

## 付録 C: フローエンジン統合詳細

### C.1 @unlaxer/tramli API 使用パターン

**Tramli.define**:
```js
Tramli.define(flowName, stateConfig)
  .setTtl(ms)
  .setMaxGuardRetries(n)
  .strictMode()
  .initiallyAvailable(...flowKeys)
  .from(state).auto(nextState, processor)
  .from(state).external(nextState, guard[, processor])
  .from(state).branch(branchDef).to(state, label[, processor]).endBranch()
  .onAnyError(errorState)
  .build()
```

**flowKey**:
```js
export const RequestOrigin = flowKey('auth.request_origin');
```
型安全なコンテキストキーを生成する。コンテキストへのアクセスは `ctx.get(key)` / `ctx.put(key, value)` / `ctx.find(key)` で行う。
- `ctx.get(key)`: 必須取得 (なければ例外)
- `ctx.find(key)`: 任意取得 (なければ undefined)

**Tramli.data**:
```js
Tramli.data([key1, value1], [key2, value2])
```
Guard の `accepted` レスポンスで複数のコンテキスト値を一度にセットするユーティリティ。

### C.2 useFlow フック

`@unlaxer/tramli-react` の `useFlow(definition)` は以下を返す:
```ts
{
  state: string;            // 現在の状態名
  context: FlowContext;     // コンテキストオブジェクト
  error: Error | null;      // エラー情報
  isLoading: boolean;       // 遷移処理中フラグ
}
```

`useAuthFlow` はこれを購読し、terminal 状態に到達したら zustand に同期する。

### C.3 Session Resume フローの初回実行タイミング

```
App.jsx レンダリング
  → useAuthFlow() 呼び出し
    → useFlow(sessionResumeDefinition)
      → SessionResumeGuard: api.me() + api.myTenants() 並列呼び出し
        → 成功: AUTHENTICATED → authStore.setAuth()
        → 失敗: NO_SESSION → authStore.setUnauthenticated()
```

`authStore` の初期状態は `loading: true, authenticated: false` であるため、
フロー完了前はローディング画面が表示される。

### C.4 Legacy init() メソッド

`authStore.init()` は tramli フロー導入前の実装で、現在は使用されていない。
`useAuthFlow` フックが tramli ベースのセッション確認を行うため、
`init()` は fallback として残されているが、どこからも呼ばれていない。

将来的には削除を検討できる。

---

## 付録 D: セキュリティ考慮事項

### D.1 認証フロー

- セッションは Cookie ベース (`credentials: 'include'`)
- OIDC のトークン交換はすべてバックエンド (volta-auth-proxy) が処理
- フロントエンドはトークンを保持しない
- 401 レスポンスを検出するが、自動リダイレクトは未実装

### D.2 管理操作の認可

現状、フロントエンドでの認可チェックは Sidebar の Monitor 表示制御のみ。
管理 API (`/api/v1/admin/*`) はバックエンドでの認可に依存している。
クライアント側で role チェックを追加することが望ましい。

### D.3 入力バリデーション

- Webhook の `endpoint_url`: `<input type="url" required>` のブラウザ標準バリデーション
- Invitation の `role`: `prompt()` で入力を受け取り、バリデーションなしで送信
  → バックエンドバリデーションに依存

### D.4 XSS 対策

React の JSX はデフォルトでエスケープを行うため、
`dangerouslySetInnerHTML` を使用していない限り XSS リスクは低い。
Monitor ページの SSE ペイロードも JSX でレンダリングされるため安全。

---

## 付録 E: 既知の制限と将来の改善案

### E.1 短期改善候補

| 優先度 | 問題 | 改善案 |
|--------|------|--------|
| 高 | Dashboard 全件 fetch | `/api/v1/admin/stats` 集計 API 追加 |
| 高 | react-router-dom / zustand の devDeps 誤配置 | `dependencies` に移動 |
| 中 | nginx の /viz/ 未定義 | ロケーション追加 |
| 中 | API 境界の非統一 | `api.js` に `mySessions`, `revokeSession`, MFA 関連を統合 |
| 中 | confirm/alert/prompt 使用 | カスタムモーダルダイアログに置き換え |
| 低 | Sidebar バージョン文字列の手動管理 | package.json から動的に読み込む |
| 低 | Audit の二重 setFilters | `handleEventChange` から `pq.setFilters` 呼び出しを削除 |

### E.2 中期改善候補

| 候補 | 説明 |
|------|------|
| テスト追加 | Vitest + Testing Library で単体・統合テスト |
| 401 グローバルハンドリング | `api.js` の `request()` 内で 401 時にリダイレクト |
| ロールベースアクセス制御 | 管理 API 呼び出し前のクライアント側 role チェック |
| トースト通知 | alert() をトースト UI に置き換え |
| IdP 設定の CRUD | 現状 read-only |
| メンバーロール更新 UI | `api.updateMember` が存在するが利用する UI がない |

### E.3 アーキテクチャ上の決定事項

- **tramli フローのフロントエンド採用**: volta-auth-proxy の Java 側状態機械と
  設計を対称にすることで、デバッグ・可視化を容易にしている
- **Zustand の採用**: シンプルな認証状態管理に特化し、Redux のような
  ボイラープレートを回避
- **URL パラメータへの状態同期**: ページング・ソート・検索条件を URL に
  保持することで、ブラウザ戻るボタンや URL 共有に対応
- **@unlaxer/tramli-viz の dynamic import**: バンドルサイズへの影響を
  最小化しつつ、Monitor ページでのビジュアライズ機能を提供

---

## 付録 F: ディレクトリ構造リファレンス

```
volta-auth-console/
├── index.html                    # Vite エントリ HTML
├── vite.config.js                # Vite 設定 (proxy, base, port)
├── nginx.conf                    # 本番 nginx 設定
├── eslint.config.js              # ESLint フラット設定
├── package.json                  # 依存定義 (v0.2.0)
├── package-lock.json
├── public/                       # 静的アセット (favicon 等)
├── dist/                         # ビルド成果物 (git 管理外)
├── docs/                         # 追加ドキュメント
│   ├── architecture.md / architecture-ja.md
│   ├── getting-started.md / getting-started-ja.md
│   ├── pages.md / pages-ja.md
│   ├── monitor-page.md / monitor-page-ja.md
│   └── spec.md                   # 旧 spec (docs 配下)
├── spec/
│   └── SPEC.md                   # 本ドキュメント (正式 spec)
└── src/
    ├── main.jsx                  # BrowserRouter + StrictMode エントリ
    ├── App.jsx                   # 認証ガード + Routes
    ├── index.css                 # グローバルスタイル (Tailwind @import)
    ├── assets/                   # バンドル対象アセット
    ├── components/
    │   ├── Sidebar.jsx           # ナビゲーションサイドバー
    │   ├── DataTable.jsx         # クライアントサイドテーブル
    │   ├── ServerDataTable.jsx   # サーバーサイドページネーションテーブル
    │   ├── AuthFlowStatus.jsx    # tramli 状態バッジ
    │   └── DateRangeFilter.jsx   # 日時範囲フィルター
    ├── hooks/
    │   ├── useAuthFlow.js        # tramli session-resume → zustand 同期
    │   └── usePaginatedQuery.js  # URL 同期ページネーションフック
    ├── lib/
    │   └── api.js                # API クライアント (fetch ラッパー)
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── Users.jsx
    │   ├── Tenants.jsx
    │   ├── Members.jsx
    │   ├── Invitations.jsx
    │   ├── Sessions.jsx
    │   ├── Audit.jsx
    │   ├── IdpConfig.jsx
    │   ├── Webhooks.jsx
    │   ├── SigningKeys.jsx
    │   ├── Settings.jsx
    │   └── Monitor.jsx
    └── store/
        ├── authStore.js          # Zustand 認証ストア
        └── authFlowDefinition.js # tramli フロー定義 (OIDC + resume)
```

---

## 付録 G: API レスポンス型リファレンス

### G.1 UserObject

```ts
interface UserObject {
  id?: string;
  userId?: string;
  email: string;
  displayName?: string;
  display_name?: string;
  tenantId?: string;
  role?: 'ADMIN' | 'OWNER' | 'MEMBER' | 'VIEWER';
  mfaEnabled?: boolean;
  active?: boolean;
  createdAt?: string;           // ISO 8601
}
```

### G.2 TenantObject

```ts
interface TenantObject {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  memberCount?: number;
  suspended?: boolean;
  mfaRequired?: boolean;
  mfaGraceDays?: number;
}
```

### G.3 SessionObject

```ts
interface SessionObject {
  id: string;
  email?: string;
  displayName?: string;
  device?: string;
  browser?: string;
  ip?: string;
  ipAddress?: string;
  ip_address?: string;
  userAgent?: string;
  user_agent?: string;
  lastActive?: string;          // ISO 8601
  last_active_at?: string;      // ISO 8601 (snake_case 候補)
}
```

### G.4 InvitationObject

```ts
interface InvitationObject {
  code: string;
  email?: string;
  role: 'MEMBER' | 'ADMIN';
  status: 'PENDING' | 'USED' | 'EXPIRED';
  expiresAt?: string;           // ISO 8601
}
```

### G.5 AuditLogObject

```ts
interface AuditLogObject {
  timestamp: string;            // ISO 8601
  event: string;                // 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | ...
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  requestId?: string;
}
```

### G.6 WebhookObject

```ts
interface WebhookObject {
  id: string;
  endpointUrl?: string;
  endpoint_url?: string;        // snake_case 候補
  url?: string;                 // 別名候補
  events?: string | string[];
  active?: boolean;
  enabled?: boolean;            // 別名候補
}
```

### G.7 WebhookDeliveryObject

```ts
interface WebhookDeliveryObject {
  id: string;
  status: 'success' | 'failed';
  statusCode?: number;
  eventType?: string;
  event_type?: string;          // snake_case 候補
  createdAt?: string;           // ISO 8601
  created_at?: string;          // snake_case 候補
  responseBody?: string;
  response_body?: string;       // snake_case 候補
}
```

### G.8 SigningKeyObject

```ts
interface SigningKeyObject {
  kid: string;                  // Key ID (JWK kid パラメータ)
  algorithm: string;            // 例: 'RS256', 'ES256'
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED';
  createdAt?: string;           // ISO 8601
}
```

### G.9 IdpConfigObject

```ts
interface IdpConfigObject {
  id: string;
  type: string;                 // 例: 'OIDC', 'SAML', 'OAUTH2'
  issuer?: string;
  enabled: boolean;
}
```

### G.10 MfaStatusObject

```ts
interface MfaStatusObject {
  totp?: {
    enabled: boolean;
    setupAt?: string;           // ISO 8601
  };
  recovery_codes_remaining?: number;
}
```

### G.11 ページネーションレスポンス共通形式

```ts
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

`usePaginatedQuery` は `result.items || []` / `result.total || 0` / `result.pages || Math.ceil(total/size)`
でフォールバックしており、`pages` フィールドが省略された場合も動作する。

---

## 付録 H: 用語集

| 用語 | 説明 |
|------|------|
| SPA | Single Page Application。Vite でビルドし nginx が配信する。 |
| volta-auth-proxy | Java 製 バックエンド。OIDC 処理・セッション管理・API 提供を担う。 |
| tramli | @unlaxer/tramli。型安全なフローエンジン。状態機械と processor/guard で構成される。 |
| tramli-viz | @unlaxer/tramli-viz。tramli フローのリアルタイムビジュアライザー (VizDashboard)。 |
| FlowKey | tramli のコンテキストキー。`flowKey('namespaced.key')` で生成。型安全なコンテキストアクセスを提供する。 |
| Guard | tramli の外部遷移トリガー。`validate()` が `accepted` を返すと遷移が実行される。 |
| Processor | tramli の自動遷移処理。`process(ctx)` でコンテキストを変換する。 |
| Branch | tramli の条件分岐。`decide(ctx)` の戻り値でどの遷移先を選ぶか決定する。 |
| OIDC | OpenID Connect。IdP (Google 等) との連携プロトコル。トークン交換はバックエンドで処理。 |
| SSE | Server-Sent Events。Monitor ページの `/viz/auth/stream` で使用するリアルタイム通知。 |
| kid | JWK Key ID。署名鍵を識別する文字列。JWT の `kid` ヘッダーと対応する。 |
| MFA | Multi-Factor Authentication。現実装は TOTP (Time-based One-Time Password) のみ対応。 |
| grace period | MFA 強制化時の猶予期間。現在は 7 日間固定 (テナント MFA 有効化時)。 |
| Zustand store | React の状態管理ライブラリ。authStore が認証状態 (user/tenants/loading/error/authenticated) を保持。 |
| usePaginatedQuery | サーバーサイドページネーション用フック。URL SearchParams と状態を同期する。 |
| DataTable | クライアントサイドの検索・ソート・ページングを持つテーブルコンポーネント。全件データを受け取る。 |
| ServerDataTable | サーバーサイドのページング対応テーブルコンポーネント。usePaginatedQuery と組み合わせて使用する。 |
