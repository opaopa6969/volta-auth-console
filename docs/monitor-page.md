[日本語版](monitor-page-ja.md)

# Monitor Page — volta-auth-console

Real-time auth flow visualization powered by tramli-viz.

---

## Overview

The `/monitor` page shows live tramli flow state transitions happening inside volta-auth-proxy — session flows, OIDC flows, passkey flows, MFA flows, and invite flows — rendered as animated state diagrams.

**Current status: blocked.** The page skeleton is implemented; the live UI requires two unresolved upstream items.

---

## Blockers

### tramli#37 — `@unlaxer/tramli-viz` not published

`@unlaxer/tramli-viz` is the React component library that renders tramli flow diagrams. It is not yet published to npm.

- The package is referenced in the Monitor page via a dynamic import with a try/catch fallback.
- Until published, the page renders the fallback UI.
- Tracking: [tramli issue #37](https://github.com/opaopa6969/tramli/issues/37)

### volta-auth-proxy#22 — WebSocket endpoint not implemented

The Monitor page connects to `wss://${window.location.host}/viz/ws` to receive real-time flow events. This endpoint does not yet exist in volta-auth-proxy.

- Tracking: [volta-auth-proxy issue #22](https://github.com/opaopa6969/volta-auth-proxy/issues/22)

---

## Design

### When both blockers are resolved

```jsx
import { VizDashboard } from '@unlaxer/tramli-viz';

<VizDashboard
  wsUrl={`wss://${window.location.host}/viz/ws`}
  flows={['session', 'oidc', 'passkey', 'mfa', 'invite']}
  layout="layered"
  theme="dark"
/>
```

### Fallback UI (current behaviour)

When `@unlaxer/tramli-viz` is unavailable or the WebSocket fails to connect:

```
┌─────────────────────────────────────────────┐
│  Monitor — Real-time Auth Flow Visualization │
│                                              │
│  ⏳ Coming Soon                              │
│                                              │
│  Dependencies:                               │
│  ✗ @unlaxer/tramli-viz   (tramli#37)        │
│  ✗ /viz/ws WebSocket     (auth-proxy#22)    │
└─────────────────────────────────────────────┘
```

### Access control

The Monitor link in the Sidebar is shown only to users with `role === 'ADMIN'` or `role === 'OWNER'`. Other roles can navigate directly to `/monitor` but see the same fallback UI.

---

## WebSocket protocol

Expected message format from volta-auth-proxy once `#22` is implemented:

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
let VizDashboard = null;
try {
  const mod = await import('@unlaxer/tramli-viz');
  VizDashboard = mod.VizDashboard;
} catch {
  // tramli#37: package not yet published — show fallback
}
```

The fallback is rendered when `VizDashboard === null` or when the WebSocket connection fails on open.
