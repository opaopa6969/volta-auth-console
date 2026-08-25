# MCP 化調査 — volta-auth-console

> Phase 1 調査（読み取り中心）。設計・実装・issue 登録は行わない。

## 概要

**volta-auth-console** は `volta-auth-proxy`（Java バックエンド）のための管理 SPA（React 19 + Vite 8）。12 画面でユーザー・テナント・セッション・監査ログ・Webhook・署名鍵・IdP 設定を管理する。

SPA 単体では API を持たず、すべての HTTP リクエストは nginx 経由で `volta-auth-proxy` (port 7070) にプロキシされる。既に volta に Docker コンテナとしてホスト済み（`https://auth-console.unlaxer.org`, port 3400）。

## 判定と理由

**判定: `skip`（対応しない）**

理由:
1. **純フロントエンド SPA であり、独自のサーバー側 API・ビジネスロジックを持たない。** すべての操作はバックエンド (`volta-auth-proxy`) の REST API に依存し、このリポジトリには MCP で公開する「能力」（入力→出力が定義できる操作）が存在しない。
2. **MCP 化の対象はバックエンド側。** ユーザー一覧・テナント停止・セッション失効・監査ログ取得等の操作は `volta-auth-proxy` の API として公開すべきものであり、このコンソールリポジトリではない。
3. **`volta-auth-proxy` は catalog で `operational_status=retired`** であり、後継の `volta-gateway` (Rust) への移行が想定される。今このコンソール周りに投資しても移行で陳腐化するリスクが高い。

## 公開候補

| kind | name | io / 説明 | 副作用 | 長時間 | 備考 |
|------|------|-----------|--------|--------|------|
| resource | spec | auth-proxy 管理 API のエンドポイント仕様 | read | false | API の実体は volta-auth-proxy 側にあるため、そちらで公開すべき |
| resource | guide | 12 画面の操作ガイド | read | false | `docs/pages.md`・`docs/spec.md` に同等情報が既存 |

tool / prompt / skill は該当なし。このリポジトリにはサーバー側ロジックがないため、tool として公開できる操作がない。

## 組み合わせ例

このリポジトリ自体は組み合わせの経路に入らない。意味のある組み合わせはバックエンド側 (volta-auth-proxy) の MCP 化で実現される:

- `authproxy__list_users` → エージェントがユーザー状況を把握 → `authproxy__suspend_tenant` でテナント停止
- `authproxy__list_audit` → 監査ログ分析 → `authproxy__revoke_session` で不審セッション失効

## 依存と協調

| 相手 repo | 方向 | 能力 | 現存 | 備考 |
|-----------|------|------|------|------|
| `volta-auth-proxy` | depends_on | 全管理 API (users, tenants, sessions, audit, webhooks, keys, idp, mfa) | yes | この SPA が存在する理由となるバックエンド。catalog で retired。MCP 化の対象はこちら |
| `volta-gateway` | depends_on | 後継認証ゲートウェイ (Rust) | yes | volta-auth-proxy の後継。今後の管理 API がこちらに移る可能性 |
| `tramli` | depends_on | @unlaxer/tramli / tramli-react / tramli-viz | yes | フロー状態管理ライブラリ。library 型で MCP 不要 |

**協調の必要性:** なし。このリポジトリが他の MCP サーバに依存することも、他に入口を提供することもない。Phase 2 で issue を立てる必要はない。

## ライブラリのサーバ化

該当しない（`needed: false`）。このリポジトリはライブラリではなく SPA であり、サーバ化の価値がない。

## リスク

- このリポジトリにはサーバー側コードがないため、MCP サーバを立てるにはバックエンド API を再実装またはプロキシする必要があるが、それは `volta-auth-proxy` の MCP 化で解決すべき問題。
- `volta-auth-proxy` が retired 状態であり、`volta-gateway` (Rust) への移行期。今このコンソール周りに投資しても移行で陳腐化する可能性が高い。

## 持ち主への質問

1. `volta-auth-proxy` → `volta-gateway` への移行後、このコンソールは使われ続けるのか？移行先に管理 API が用意されるのか？
2. バックエンド (`volta-auth-proxy` or `volta-gateway`) の管理 API を MCP 化する計画はあるか？もしあれば、このコンソールの UI は人間向け・MCP はエージェント向けと住み分けられる。
