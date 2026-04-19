# DD-002: 12-page flat layout with role-based sidebar

**Date**: 2026-03-01  
**Status**: Accepted

---

## Context

The admin console needs to surface operations across five domains: users, tenants/members/invitations, sessions, audit, and configuration (IdP, webhooks, signing keys, settings). The structure should be navigable by admins who may need to jump between domains frequently.

---

## Decision

Use a **flat 12-page layout** with a persistent left sidebar and role-gated links.

---

## Pages

| # | Route | Domain | Min role |
|---|-------|--------|----------|
| 1 | `/` | Dashboard | Any |
| 2 | `/users` | Users | ADMIN |
| 3 | `/tenants` | Tenants | ADMIN |
| 4 | `/members` | Tenants | Any |
| 5 | `/invitations` | Tenants | Any |
| 6 | `/sessions` | Sessions | ADMIN |
| 7 | `/audit` | Audit | ADMIN |
| 8 | `/idp` | Configuration | OWNER |
| 9 | `/webhooks` | Configuration | OWNER |
| 10 | `/keys` | Configuration | ADMIN |
| 11 | `/settings` | Configuration | OWNER |
| 12 | `/monitor` | Observability | ADMIN |

---

## Alternatives considered

### Nested routes (e.g., `/tenants/:tid/members`)

Rejected. The current UX selects a tenant via a dropdown within the Members/Invitations/IdP/Webhooks pages. Nested routes would require a tenant-selection step in the URL, adding friction for admins who manage a single tenant.

### Tabbed layout within domains

Rejected. Tabs within a domain (e.g., Tenants + Members + Invitations as tabs) make deep-linking harder and increase per-page component complexity.

---

## Role gating

The Sidebar hides links the current user cannot use:

- `ADMIN` / `OWNER` — see all 12 links (Monitor shown only to these roles)
- Other roles — see Dashboard, Members, Invitations only

Role is read from `useAuthStore().user.role`.

---

## Consequences

- Flat routing is easy to maintain — adding a 13th page is a one-line addition to `App.jsx` and `Sidebar.jsx`
- Each page is independently loadable via direct URL — good for deep-linking in support workflows
- The Monitor page (12th) is intentionally last — it is an observability tool, not a day-to-day admin screen
