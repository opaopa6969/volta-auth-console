// --- URL prefix の規約 ---------------------------------------------------
// このフロントが叩くサーバー (volta-auth-proxy / Javalin) は、歴史的経緯で
// 3 種類の prefix を持つ。クライアントから「勝手に統一」するとサーバーの
// ルート登録 (ApiRouter.java) と食い違って 404 になるため、規約として固定する。
//
//   API_BASE  = '/api/v1'  … 管理・テナント・ユーザー系の正規 REST API。
//                            原則すべてここに寄せる (request() のデフォルト)。
//   ME_BASE   = '/api/me'  … 「ログイン中ユーザー自身」のセッション一覧/失効。
//                            サーバー側は /api/me/sessions のみで登録されており
//                            (/api/v1/users/me/sessions は未実装)、ここだけは
//                            勝手に /api/v1 へ移せない。移すにはサーバー側の
//                            ルート追加 + nginx rewrite が必要 → バックログ。
//   /auth/...              … ForwardAuth / ログイン・ログアウト等の認証
//                            アクション用。REST リソースではなく意味が異なる
//                            ので /api/v1 とは別物として扱う。
//
// nginx.conf 側は `location /api/` と `location /auth/` の 2 ブロックで
// まとめて proxy しているので、上記 3 prefix はすべて同一 upstream に届く。
const API_BASE = '/api/v1';
const ME_BASE = '/api/me';

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
  // mySessions / revokeSession は「自分自身」のセッションを ME_BASE (/api/me)
  // で扱う。サーバー側 ( ApiRouter.java ) が /api/me/sessions (GET) と
  // /api/me/sessions/{id} (DELETE) を登録しているのに合わせる。
  // 以前は revokeSession だけ /auth/sessions/{id} を叩いていて prefix が
  // バラバラだったが、サーバーは同一処理を /api/me/sessions/{id} でも提供
  // しているので、list と同じ namespace に統一した (フロントのみで完結)。
  // 生 fetch ではなく rawRequest を通すことで 401/非2xx のエラーハンドリングを共通化。
  mySessions: () => rawRequest(`${ME_BASE}/sessions`).then(d => d.items || d),
  revokeSession: (id) => rawRequest(`${ME_BASE}/sessions/${id}`, { method: 'DELETE' }),

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
