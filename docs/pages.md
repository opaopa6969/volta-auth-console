[日本語版](pages-ja.md)

# Pages — volta-auth-console

Each of the 12 pages, its role, and the API endpoints it calls.

---

## Dashboard (`/`)

**Role**: Overview of the current authenticated user's context and auth flow state.

**Components**:
- `AuthFlowStatus` — displays the current tramli state (`CHECKING` / `AUTHENTICATED` / `NO_SESSION`)
- Summary stats (user count, tenant count)

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/users/me` | Current user (via sessionResumeDefinition) |
| GET | `/api/v1/users/me/tenants` | User's tenants (via sessionResumeDefinition) |

---

## Users (`/users`)

**Role**: List and search all users across the platform. ADMIN/OWNER only.

**Features**: Server-side pagination, search by email/name, sort by email/displayName/createdAt.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/admin/users?page=&size=&sort=&q=` | Paginated user list |

---

## Tenants (`/tenants`)

**Role**: List all tenants, suspend or activate them. ADMIN/OWNER only.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/admin/tenants` | All tenants |
| POST | `/api/v1/admin/tenants/:tid/suspend` | Suspend tenant |
| POST | `/api/v1/admin/tenants/:tid/activate` | Activate tenant |

---

## Members (`/members`)

**Role**: View and manage members within the current tenant.

**Features**: Server-side pagination, role update.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/tenants/:tid/members?page=&size=` | Paginated member list |
| PATCH | `/api/v1/tenants/:tid/members/:mid` | Update member role |
| DELETE | `/api/v1/tenants/:tid/members/:uid/mfa` | Reset member MFA |

---

## Invitations (`/invitations`)

**Role**: Manage invitations for the current tenant. Send, view, and delete invites.

**Features**: Server-side pagination, status filter (PENDING / USED / EXPIRED).

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/tenants/:tid/invitations?page=&size=&status=` | Paginated invitation list |
| POST | `/api/v1/tenants/:tid/invitations` | Create invitation |
| DELETE | `/api/v1/tenants/:tid/invitations/:iid` | Delete invitation |

---

## Sessions (`/sessions`)

**Role**: View active sessions platform-wide and revoke them. ADMIN/OWNER only.

**Features**: Server-side pagination, filter by user_id.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/admin/sessions?page=&size=&user_id=` | Paginated session list |
| GET | `/api/me/sessions` | Current user's own sessions |
| DELETE | `/auth/sessions/:id` | Revoke a session |

> **API inconsistency**: `/api/me/sessions` and `/auth/sessions/:id` deviate from the `/api/v1/` prefix — tracked for cleanup.

---

## Audit (`/audit`)

**Role**: View the platform-wide event audit log. ADMIN/OWNER only.

**Features**: Server-side pagination (default size 50), date-range filter, event type filter.

**Components**: `DateRangeFilter` — quick-select: 1h, 24h, 7d, 30d; or custom from/to.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/admin/audit?page=&size=&from=&to=&event=` | Paginated audit log |

---

## IdpConfig (`/idp`)

**Role**: Configure identity providers (OIDC, SAML) for the current tenant. OWNER only.

**Features**: Client-side `DataTable` (bounded dataset).

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/tenants/:tid/idp-configs` | List IdP configs |

---

## Webhooks (`/webhooks`)

**Role**: Create, edit, and delete webhooks for the current tenant. View delivery history. OWNER only.

**Features**: Client-side `DataTable`.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/tenants/:tid/webhooks` | List webhooks |
| POST | `/api/v1/tenants/:tid/webhooks` | Create webhook |
| PATCH | `/api/v1/tenants/:tid/webhooks/:wid` | Update webhook |
| DELETE | `/api/v1/tenants/:tid/webhooks/:wid` | Delete webhook |
| GET | `/api/v1/tenants/:tid/webhooks/:wid/deliveries` | Delivery history |

---

## SigningKeys (`/keys`)

**Role**: View active signing keys and trigger rotation. ADMIN only.

**Features**: Client-side `DataTable`.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/admin/keys` | List signing keys |
| POST | `/api/v1/admin/keys/rotate` | Rotate keys |

---

## Settings (`/settings`)

**Role**: Manage tenant-level settings (display name, allowed domains, etc.). OWNER only.

**APIs**:
| Method | Endpoint | Usage |
|--------|----------|-------|
| GET | `/api/v1/tenants/:tid` | Get tenant details |
| PATCH | `/api/v1/tenants/:tid` | Update tenant settings |

---

## Monitor (`/monitor`)

**Role**: Real-time visualization of tramli auth flows running in volta-auth-proxy. ADMIN/OWNER only.

**Status**: Blocked — see [docs/monitor-page.md](monitor-page.md).

**Blockers**:
- **tramli#37** — `@unlaxer/tramli-viz` not yet published
- **volta-auth-proxy#22** — WebSocket endpoint not yet implemented

**Fallback UI**: When either blocker is unresolved, the page shows a status panel listing the missing dependencies and an estimated timeline.
