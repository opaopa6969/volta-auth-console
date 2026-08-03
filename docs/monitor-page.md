[日本語版](monitor-page-ja.md)

# Monitor Page — volta-auth-console

Real-time auth flow visualization powered by tramli-viz.

---

## Overview

The `/monitor` page shows live tramli flow state transitions happening inside volta-auth-proxy — session flows, OIDC flows, passkey flows, MFA flows, and invite flows — rendered as animated state diagrams.

**Current status: shipped.** The page loads `@unlaxer/tramli-viz@^0.2.0`, connects `VizDashboard` to `/viz/ws`, and subscribes to `/viz/auth/stream` for live events.

---

## Current connection behaviour

`EventSource` subscribes to `/viz/auth/stream` and `GET /viz/flows` loads the flow definitions. If either endpoint is unavailable, the page remains visible with a disconnected/error status and no live events.

### WebSocket bridge

The Monitor page connects to `wss://${window.location.host}/viz/ws` to receive real-time flow events from the auth-proxy bridge.


---

## Design

```jsx
import { VizDashboard } from '@unlaxer/tramli-viz';

<VizDashboard
  wsUrl={`wss://${window.location.host}/viz/ws`}
  flows={['session', 'oidc', 'passkey', 'mfa', 'invite']}
  layout="layered"
  theme="dark"
/>
```

### Visualization

The dashboard is loaded lazily with `layout="layered"`, `theme="dark"`, metrics, car-pool, and replay controls. Connection state is handled by the dashboard.

```
┌─────────────────────────────────────────────┐
│  Monitor — Real-time Auth Flow Visualization │
│                                              │
│  ● disconnected / error                     │
│                                              │
│  Live feed unavailable / disconnected        │
└─────────────────────────────────────────────┘
```

### Access control

The Monitor link in the Sidebar is shown only to users with `role === 'ADMIN'` or `role === 'OWNER'`. Other roles can navigate directly to `/monitor`; the route itself does not add a separate role guard.

---

## WebSocket protocol

The WebSocket bridge supplies the protocol consumed by `tramli-viz`.

```json
{
  "type": "flow_transition",
  "flowId": "session-resume:abc123",
  "from": "CHECKING",
  "to": "AUTHENTICATED",
  "timestamp": "2026-04-19T10:00:00Z"
}
```

tramli-viz subscribes to this stream and updates the diagram in real time.

---

## Implementation file

`src/pages/Monitor.jsx` — the page component.

Key logic:

```js
const VizDashboardLazy = lazy(() =>
  import('@unlaxer/tramli-viz').then(m => ({ default: m.VizDashboard }))
);
```

SSE failures update the status indicator rather than switching to a Coming Soon screen.
