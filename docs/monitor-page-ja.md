[English version](monitor-page.md)

# Monitor ページ — volta-auth-console

tramli-viz による認証フローのリアルタイム可視化。

---

## 概要

`/monitor` ページは、volta-auth-proxy 内で発生している tramli フローのステート遷移をライブ表示する — セッションフロー・OIDC フロー・パスキーフロー・MFA フロー・招待フローをアニメーション付きステート図として描画する。

**現在のステータス: 利用可能。** `@unlaxer/tramli-viz@0.2.0`、auth-proxy の `/viz/ws` bridge、並列の SSE ライブフィードを使う。

---

## データソース

- `GET /viz/flows` — 静的なフロー定義。
- `GET /viz/auth/stream`（SSE）— 認証イベント。
- `ws(s)://${window.location.host}/viz/ws` — tramli-viz のフローテレメトリ。

---

## 設計

`Monitor.jsx` は `VizDashboard` を遅延ロードし、`wsUrl`、`layout="layered"`、
`theme="dark"`、`showMetrics`、`showCarPool`、`showReplay` を渡す。

### アクセス制御

Sidebar の Monitor リンクは `role === 'ADMIN'` または `role === 'OWNER'` のユーザーにのみ表示される。`App.jsx` はルート自体を遮断しない。

---

## WebSocket プロトコル

SSE フィードは `auth-event` イベントとして次のような JSON を送る:

```json
{
  "type": "flow_transition",
  "flowId": "session-resume:abc123",
  "from": "CHECKING",
  "to": "AUTHENTICATED",
  "timestamp": "2026-04-19T10:00:00Z"
}
```

WebSocket プロトコルは auth-proxy bridge が提供し、tramli-viz が消費する。

---

## 実装ファイル

`src/pages/Monitor.jsx` — ページコンポーネント。

核心ロジックは `@unlaxer/tramli-viz` の動的 import と、SSE フィードおよび
WebSocket ダッシュボードの並列接続。`/viz/flows` の取得失敗は soft-fail として扱う。
