[English version](monitor-page.md)

# Monitor ページ — volta-auth-console

tramli-viz による認証フローのリアルタイム可視化。

---

## 概要

`/monitor` ページは、volta-auth-proxy 内で発生している tramli フローのステート遷移をライブ表示する — セッションフロー・OIDC フロー・パスキーフロー・MFA フロー・招待フローをアニメーション付きステート図として描画する。

**現在のステータス: 実装済み。** `@unlaxer/tramli-viz@^0.2.0` を読み込み、`VizDashboard` を `/viz/ws` に接続し、`/viz/auth/stream` のライブイベントを購読する。

---

## 現在の接続動作

`EventSource` で `/viz/auth/stream` を購読し、`GET /viz/flows` からフロー定義を取得する。どちらかが利用できない場合もページは表示され、切断/エラー状態とライブイベントなしで動作する。

### 過去のブロッカー

`@unlaxer/tramli-viz` は公開済みで、runtime dependency として登録されている。

- Dashboard は lazy import で表示する。

### WebSocket bridge

Monitor ページは `wss://${window.location.host}/viz/ws` に接続して auth-proxy bridge からリアルタイムフローイベントを受信する。


---

## 設計

```jsx
import { VizDashboard } from '@unlaxer/tramli-viz';

<VizDashboard
  wsUrl={`wss://${window.location.host}/viz/ws`}
  flows={['session', 'oidc', 'passkey', 'mfa', 'invite']}
  layout="layered"
  theme="dark"
/>
```

### 可視化

Dashboard は `layout="layered"`、`theme="dark"`、メトリクス・car pool・replay を有効にして lazy load される。接続状態は Dashboard が扱う。

```
┌─────────────────────────────────────────────────────┐
│  Monitor — リアルタイム認証フロー可視化              │
│                                                      │
│  ● disconnected / error                             │
│                                                      │
│  Live feed unavailable / disconnected                │
└─────────────────────────────────────────────────────┘
```

### アクセス制御

Sidebar の Monitor リンクは `role === 'ADMIN'` または `role === 'OWNER'` のユーザーにのみ表示される。他のロールも `/monitor` に直接アクセスできるが、ルート自体では別のロールガードを追加していない。

---

## WebSocket プロトコル

WebSocket bridge は `tramli-viz` が消費するプロトコルを提供する。

```json
{
  "type": "flow_transition",
  "flowId": "session-resume:abc123",
  "from": "CHECKING",
  "to": "AUTHENTICATED",
  "timestamp": "2026-04-19T10:00:00Z"
}
```

tramli-viz はこのストリームを購読し、リアルタイムで図を更新する。

---

## 実装ファイル

`src/pages/Monitor.jsx` — ページコンポーネント。

核心ロジック:

```js
const VizDashboardLazy = lazy(() =>
  import('@unlaxer/tramli-viz').then(m => ({ default: m.VizDashboard }))
);
```

SSE の失敗はステータス表示に反映し、Coming Soon 画面へは切り替えない。
