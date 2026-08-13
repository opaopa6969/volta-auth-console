[日本語版](monitor-page-ja.md)

# Monitor Page — volta-auth-console

Real-time auth flow visualization powered by tramli-viz.

---

## Overview

The `/monitor` page shows live tramli flow state transitions happening inside volta-auth-proxy — session flows, OIDC flows, passkey flows, MFA flows, and invite flows — rendered as animated state diagrams.

**Current status: available.** The page uses `@unlaxer/tramli-viz@0.2.0`, the auth-proxy `/viz/ws` bridge, and a parallel SSE live feed.

---

## Data sources

- `GET /viz/flows` — static flow definitions.
- `GET /viz/auth/stream` (SSE) — live auth events.
- `ws(s)://${window.location.host}/viz/ws` — tramli-viz flow telemetry.

---

## Design

`Monitor.jsx` lazy-loads `VizDashboard` and passes `wsUrl`, `layout="layered"`,
`theme="dark"`, `showMetrics`, `showCarPool`, and `showReplay`.

### Access control

The Monitor link in the Sidebar is shown only to users with `role === 'ADMIN'` or `role === 'OWNER'`. Route access itself is not blocked by `App.jsx`.

---

## WebSocket protocol

The SSE feed uses `auth-event` events containing JSON payloads such as:

```json
{
  "type": "flow_transition",
  "flowId": "session-resume:abc123",
  "from": "CHECKING",
  "to": "AUTHENTICATED",
  "timestamp": "2026-04-19T10:00:00Z"
}
```

The WebSocket protocol is provided by the auth-proxy bridge and consumed by tramli-viz.

---

## Implementation file

`src/pages/Monitor.jsx` — the page component.

Key logic:

The implementation uses a dynamic import of `@unlaxer/tramli-viz` and keeps the SSE
feed and WebSocket dashboard active in parallel. A failed `/viz/flows` request is a
soft failure; the live feed and dashboard are still rendered.
