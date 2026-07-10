[日本語版はこちら / Japanese](README-ja.md)

# volta-auth-console

Admin SPA for [volta-auth-proxy](https://github.com/opaopa6969/volta-auth-proxy) — built with **React 19 + Vite 8**.

Authentication state is managed on the frontend as a tramli state machine (`authFlowDefinition`), mirroring the Java-side `AuthState` in volta-auth-proxy.

---

## Table of Contents

- [Overview](#overview)
- [12 Pages](#12-pages)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Auth Flow (tramli)](#auth-flow-tramli)
- [API Boundaries](#api-boundaries)
- [nginx.conf](#nginxconf)
- [Known Issues](#known-issues)
- [Docs](#docs)

---

## Overview

| Item | Value |
|------|-------|
| Framework | React 19 + Vite 8 |
| Routing | react-router-dom v7 (devDep — see [Known Issues](#known-issues)) |
| State | zustand v5 (devDep — see [Known Issues](#known-issues)) |
| Auth state machine | @unlaxer/tramli + @unlaxer/tramli-react |
| Styling | Tailwind CSS v4 |
| Backend | volta-auth-proxy (proxied via nginx) |

---

## 12 Pages

| Route | Page | Role |
|-------|------|------|
| `/` | Dashboard | Auth flow status, summary stats |
| `/users` | Users | Server-paginated user list, search |
| `/tenants` | Tenants | Tenant list, suspend/activate |
| `/members` | Members | Per-tenant member management |
| `/invitations` | Invitations | Invite management, status filter |
| `/sessions` | Sessions | Active session list, revoke |
| `/audit` | Audit | Event log, date-range filter |
| `/idp` | IdpConfig | IdP configuration per tenant |
| `/webhooks` | Webhooks | Webhook CRUD + delivery history |
| `/keys` | SigningKeys | Signing key list, rotate |
| `/settings` | Settings | Tenant-level settings |
| `/monitor` | Monitor | tramli-viz real-time flow (SSE live feed + WS bridge, shipped) |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Start dev server (large header size required for auth cookies)
npm run dev
# → http://localhost:5173

# 3. Build
npm run build
```

Development requires volta-auth-proxy running and reachable. See [docs/getting-started.md](docs/getting-started.md).

---

## Project Structure

```
src/
  App.jsx                    # Routes + auth guard
  pages/                     # 12 page components
  components/
    Sidebar.jsx              # Navigation (Monitor: ADMIN/OWNER only)
    AuthFlowStatus.jsx       # Current tramli state display
    ServerDataTable.jsx      # Server-side paginated table
    DateRangeFilter.jsx      # Audit date-range picker
  hooks/
    useAuthFlow.js           # tramli session-resume wrapper
    usePaginatedQuery.js     # URL-synced pagination hook
  store/
    authStore.js             # zustand auth store
    authFlowDefinition.js    # tramli FlowDefinitions (auth + session-resume)
  lib/
    api.js                   # API client (see API Boundaries)
```

---

## Auth Flow (tramli)

`src/store/authFlowDefinition.js` defines two flows:

### `authFlowDefinition` — 10-state OIDC flow

```
UNAUTHENTICATED → LOGIN_REDIRECT → LOGIN_PENDING
  → CALLBACK_RECEIVED → USER_RESOLVED
  → [SESSION_CREATED | MFA_PENDING] → SESSION_CREATED
  → COMPLETE
  → FAILED / EXPIRED (terminal errors)
```

This mirrors `volta-auth-proxy`'s Java-side `AuthState`. The frontend does not perform the OIDC token exchange itself — it tracks *which phase* the backend is in.

### `sessionResumeDefinition` — 2-state resume check

```
CHECKING → AUTHENTICATED (terminal)
         → NO_SESSION    (terminal)
```

Called on app mount via `useAuthFlow()`. On success, syncs `ResumeUser` / `ResumeTenants` into zustand `authStore`.

---

## API Boundaries

The API client (`src/lib/api.js`) issues every call under a single prefix, all proxied to volta-auth-proxy:

| Prefix | Usage | Notes |
|--------|-------|-------|
| `/api/v1/` | Admin, tenant, and user-self APIs | Sole prefix used by `api.js` (via `request()`). Self session list/revoke live at `/api/v1/users/me/sessions` |
| `/auth/` | Auth actions (login / logout / ForwardAuth) | Proxy-level, redirect-based — not called by `api.js` |

> **Unified**: the former `/api/me/` prefix (once used for `mySessions`) is retired — `api.js` drops `ME_BASE` and routes `mySessions` / `revokeSession` through `/api/v1/users/me/sessions`. The old `/api/me/sessions` and `/auth/sessions/{id}` routes remain server-side for backward compatibility only.

---

## nginx.conf

`nginx.conf` proxies all `/api/`, `/auth/`, and `/.well-known/` traffic to volta-auth-proxy.

**The backend IP is hardcoded** (`192.168.1.13:7070` as example). Change this before deploying:

```nginx
proxy_pass http://192.168.1.13:7070;   # ← replace with your host
```

For production, use an environment variable or a named upstream block. See [docs/architecture.md](docs/architecture.md#nginxconf).

---

## Known Issues

### react-router-dom / zustand in devDependencies

`react-router-dom` and `zustand` are listed under `devDependencies` in `package.json`. Both are **runtime dependencies** and should be moved to `dependencies` before publishing or containerizing. They work in dev/build because Vite bundles everything, but the misclassification is a warning for downstream consumers.

### Monitor page — shipped

The `/monitor` page is now in production. `@unlaxer/tramli-viz@^0.2.0` is a runtime dependency, `Monitor.jsx` sets `TRAMLI_VIZ_AVAILABLE = true`, and `VizDashboard` connects to the auth-proxy `/viz/ws` bridge, with an `/viz/auth/stream` SSE live feed running in parallel. The former blockers (`tramli#37` viz-unpublished, `volta-auth-proxy#22` WS-endpoint) are resolved.

---

## Docs

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System architecture, auth flow, nginx, API boundaries |
| [docs/getting-started.md](docs/getting-started.md) | Dev environment setup, proxy connection |
| [docs/pages.md](docs/pages.md) | Per-page role and API mapping |
| [docs/monitor-page.md](docs/monitor-page.md) | Monitor page design and blockers |
| [docs/decisions/](docs/decisions/) | Architecture decision records |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
