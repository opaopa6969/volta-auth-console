[English version](monitor-page.md)

# Monitor ページ — volta-auth-console

tramli-viz による認証フローのリアルタイム可視化。

---

## 概要

`/monitor` ページは、volta-auth-proxy 内で発生している tramli フローのステート遷移をライブ表示する — セッションフロー・OIDC フロー・パスキーフロー・MFA フロー・招待フローをアニメーション付きステート図として描画する。

**現在のステータス: ブロック中。** ページの骨組みは実装済み。ライブ UI には未解決の上流タスクが 2 つある。

---

## ブロッカー

### tramli#37 — `@unlaxer/tramli-viz` 未公開

`@unlaxer/tramli-viz` は tramli フロー図を描画する React コンポーネントライブラリ。まだ npm に公開されていない。

- Monitor ページでは try/catch フォールバック付きの動的 import で参照している。
- 公開されるまでフォールバック UI を表示する。
- 追跡: [tramli issue #37](https://github.com/opaopa6969/tramli/issues/37)

### volta-auth-proxy#22 — WebSocket エンドポイント未実装

Monitor ページは `wss://${window.location.host}/viz/ws` に接続してリアルタイムフローイベントを受信する。このエンドポイントは volta-auth-proxy にまだ存在しない。

- 追跡: [volta-auth-proxy issue #22](https://github.com/opaopa6969/volta-auth-proxy/issues/22)

---

## 設計

### 両ブロッカーが解消された場合

```jsx
import { VizDashboard } from '@unlaxer/tramli-viz';

<VizDashboard
  wsUrl={`wss://${window.location.host}/viz/ws`}
  flows={['session', 'oidc', 'passkey', 'mfa', 'invite']}
  layout="layered"
  theme="dark"
/>
```

### フォールバック UI（現在の動作）

`@unlaxer/tramli-viz` が利用できない、または WebSocket 接続に失敗した場合:

```
┌─────────────────────────────────────────────────────┐
│  Monitor — リアルタイム認証フロー可視化              │
│                                                      │
│  ⏳ Coming Soon                                      │
│                                                      │
│  依存関係:                                            │
│  ✗ @unlaxer/tramli-viz   (tramli#37)                │
│  ✗ /viz/ws WebSocket     (auth-proxy#22)            │
└─────────────────────────────────────────────────────┘
```

### アクセス制御

Sidebar の Monitor リンクは `role === 'ADMIN'` または `role === 'OWNER'` のユーザーにのみ表示される。他のロールは `/monitor` に直接アクセスできるが、同じフォールバック UI が表示される。

---

## WebSocket プロトコル

`#22` 実装後に volta-auth-proxy から送信される想定メッセージ形式:

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
let VizDashboard = null;
try {
  const mod = await import('@unlaxer/tramli-viz');
  VizDashboard = mod.VizDashboard;
} catch {
  // tramli#37: パッケージ未公開 — フォールバックを表示
}
```

`VizDashboard === null` のとき、または WebSocket 接続が open 時に失敗したときにフォールバックを表示する。
