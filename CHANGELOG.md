# Changelog

All notable changes to volta-auth-console are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **AUTH-VIZ Phase 1/2 本番化**: `@unlaxer/tramli-viz@0.2.0` を dependency に追加し、Monitor ページの `TRAMLI_VIZ_AVAILABLE` を `true` に切替。`VizDashboard` を `wsUrl={wss://host/viz/ws}` で auth-proxy の WS bridge (AUTH-VIZ Phase 1) に接続し、5 SM の multi-layout + car pool + replay コントロールを実表示。既存 SSE live feed (`/viz/auth/stream`, SAAS-016) も並列で残し二重経路で運用。
- **SAAS-016 + AUTH-VIZ Phase 2 frontend**: Monitor ページを preview から本番実装に。`EventSource` で `/viz/auth/stream` (SSE) を購読し、login/logout/MFA 系イベントをリアルタイム feed 表示。`/viz/flows` を起動時に fetch して各 flow の mermaid 定義を FlowCard に表示、SSE イベント種別から per-flow ライブカウントを加算。

### Planned
- Move `react-router-dom` and `zustand` from `devDependencies` to `dependencies`
- Unify API path prefixes (`/api/me/`, `/auth/` → `/api/v1/`)
- Replace hardcoded nginx backend IP with environment-variable-driven upstream

---

## [0.2.0] - 2026-04-19

### Added
- **Monitor page** (`/monitor`) — tramli-viz integration skeleton with Coming Soon fallback
  - Renders `VizDashboard` when `@unlaxer/tramli-viz` is available
  - Falls back gracefully when `tramli#37` or `volta-auth-proxy#22` are unresolved
  - WebSocket URL: `wss://${window.location.host}/viz/ws`
- **tramli auth flow** — `src/store/authFlowDefinition.js`
  - `authFlowDefinition`: 10-state OIDC flow mirroring Java-side `AuthState`
  - `sessionResumeDefinition`: 2-state resume check (`CHECKING → AUTHENTICATED / NO_SESSION`)
- **`useAuthFlow` hook** — wraps `sessionResumeDefinition`, syncs result into zustand authStore
- **`AuthFlowStatus` component** — displays current tramli state on Dashboard; MFA_PENDING shows MFA form link
- **Server-side pagination** — `usePaginatedQuery` hook + `ServerDataTable` component
  - URL parameter sync via `useSearchParams`
  - 300 ms debounced search, browser-back compatible
- **`DateRangeFilter` component** — from/to datetime picker for Audit page; quick-select: 1h, 24h, 7d, 30d
- **Paginated API methods** — `listUsers`, `listSessions`, `listAudit`, `listMembers`, `listInvitations` accept `params`
- **`paginated()` helper** in `api.js` — null-filtered query string builder
- Sidebar: Monitor link added (ADMIN/OWNER only)

### Changed
- `authStore.js` refactored to use `sessionResumeDefinition` instead of direct `api.me()` + `api.myTenants()` calls
- `Users`, `Sessions`, `Audit`, `Members`, `Invitations` pages switched to `ServerDataTable`
- `App.jsx` — added `<Route path="/monitor">` and `useAuthFlow()` call

### Notes
- `react-router-dom` and `zustand` remain in `devDependencies` (known misclassification)
- nginx `proxy_pass` target is hardcoded to `192.168.1.13:7070` (example value — change before deploying)

---

## [0.1.0] - 2026-03-01

### Added
- Initial SPA scaffolded with Vite + React 19
- 11 pages: Dashboard, Users, Tenants, Members, Invitations, Sessions, Audit, IdpConfig, Webhooks, SigningKeys, Settings
- `authStore.js` — zustand store with direct `api.me()` + `api.myTenants()` session check
- `api.js` — base API client with `/api/v1/` prefix, credential-bearing fetch
- Sidebar navigation
- `nginx.conf` — SPA fallback + reverse proxy to volta-auth-proxy
- Tailwind CSS v4 dark theme
