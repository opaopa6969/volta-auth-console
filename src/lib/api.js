const BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
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

export const api = {
  // Users
  me: () => request('/users/me'),
  myTenants: () => request('/users/me/tenants').then(d => d.items || d),
  listUsers: () => items('/admin/users'),

  // Tenants
  getTenant: (tid) => request(`/tenants/${tid}`),
  adminTenants: () => items('/admin/tenants'),
  suspendTenant: (tid) => request(`/admin/tenants/${tid}/suspend`, { method: 'POST' }),
  activateTenant: (tid) => request(`/admin/tenants/${tid}/activate`, { method: 'POST' }),

  // Members
  listMembers: (tid) => items(`/tenants/${tid}/members`),
  updateMember: (tid, mid, data) => request(`/tenants/${tid}/members/${mid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Invitations
  listInvitations: (tid) => items(`/tenants/${tid}/invitations`),
  createInvitation: (tid, data) => request(`/tenants/${tid}/invitations`, { method: 'POST', body: JSON.stringify(data) }),
  deleteInvitation: (tid, iid) => request(`/tenants/${tid}/invitations/${iid}`, { method: 'DELETE' }),

  // Sessions
  mySessions: () => fetch('/api/me/sessions', { credentials: 'include' }).then(r => r.json()).then(d => d.items || d),
  revokeSession: (id) => fetch(`/auth/sessions/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),

  // Audit
  listAudit: () => items('/admin/audit'),

  // IdP
  listIdpConfigs: (tid) => items(`/tenants/${tid}/idp-configs`),

  // Webhooks
  listWebhooks: (tid) => items(`/tenants/${tid}/webhooks`),
  createWebhook: (tid, data) => request(`/tenants/${tid}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
  updateWebhook: (tid, wid, data) => request(`/tenants/${tid}/webhooks/${wid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWebhook: (tid, wid) => request(`/tenants/${tid}/webhooks/${wid}`, { method: 'DELETE' }),

  // MFA
  adminResetMfa: (tid, uid) => request(`/tenants/${tid}/members/${uid}/mfa`, { method: 'DELETE' }),

  // Keys
  listKeys: () => items('/admin/keys'),
  rotateKeys: () => request('/admin/keys/rotate', { method: 'POST' }),
};
