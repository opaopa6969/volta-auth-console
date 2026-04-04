const BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login?return_to=' + encodeURIComponent(window.location.href);
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Users
  me: () => request('/users/me'),
  myTenants: () => request('/users/me/tenants'),
  listUsers: () => request('/admin/users'),

  // Tenants
  getTenant: (tid) => request(`/tenants/${tid}`),
  adminTenants: () => request('/admin/tenants'),
  suspendTenant: (tid) => request(`/admin/tenants/${tid}/suspend`, { method: 'POST' }),
  activateTenant: (tid) => request(`/admin/tenants/${tid}/activate`, { method: 'POST' }),

  // Members
  listMembers: (tid) => request(`/tenants/${tid}/members`),
  updateMember: (tid, mid, data) => request(`/tenants/${tid}/members/${mid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Invitations
  listInvitations: (tid) => request(`/tenants/${tid}/invitations`),
  createInvitation: (tid, data) => request(`/tenants/${tid}/invitations`, { method: 'POST', body: JSON.stringify(data) }),
  deleteInvitation: (tid, iid) => request(`/tenants/${tid}/invitations/${iid}`, { method: 'DELETE' }),

  // Sessions
  mySessions: () => fetch('/api/me/sessions', { credentials: 'include' }).then(r => r.json()),
  revokeSession: (id) => fetch(`/auth/sessions/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),

  // Audit
  listAudit: (tid) => request(`/admin/audit`),

  // IdP
  listIdpConfigs: (tid) => request(`/tenants/${tid}/idp-configs`),

  // Webhooks
  listWebhooks: (tid) => request(`/tenants/${tid}/webhooks`),

  // Keys
  listKeys: () => request('/admin/keys'),
  rotateKeys: () => request('/admin/keys/rotate', { method: 'POST' }),
};
