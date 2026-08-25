# MCP 化調査 — volta-auth-console

> 調査日: 2026-08-21 | 判定: **skip**

## 概要

volta-auth-console は **volta-auth-proxy**（Java バックエンド）の管理 UI として機能する **React 19 + Vite 8** 製 Single Page Application（SPA）である。ユーザー・テナント・セッション・監査ログ・IdP・Webhook・署名鍵・MFA の管理画面 12 ページを提供するが、ビジネスロジックはすべてバックエンドに委譲しており、SPA 自身はプレゼンテーション層のみを持つ。

- **種別**: `service`（常駐サーバ = nginx 配下の静的 SPA、既に volta にホスト済み `https://auth-console.unlaxer.org`）
- **ホスト**: Docker（192.168.1.50:3400）
- **MCP バックエンド**: なし（catalog に `backend: null` / `tools: []`）

## 判定と理由

### 判定: `skip`（対応しない）

このリポジトリは純粋なフロントエンド SPA であり、**独自の呼び出し可能な能力を持たない**。すべての操作（ユーザー管理、テナント停止/有効化、セッション失効、監査ログ照会、Webhook CRUD、鍵ローテーション、MFA リセット等）は volta-auth-proxy の REST API（`/api/v1/*`）への薄いラッパーに過ぎない。

MCP サーバをこの SPA に付けても volta-auth-proxy の API の二重ラッパーになるだけで、discovery・composability の価値を生まない。認証管理操作の MCP 化が望まれる場合は、能力の実体を持つ **volta-auth-proxy 側**で MCP 化すべきであり、このコンソールはその `resource://guide`（使い方）の参照元にとどまるべき。

## 公開候補

| kind | name | io | 副作用 | 長時間 |
|------|------|----|--------|--------|
| —    | —    | —  | —      | —      |

公開候補なし。SPA はバックエンド API のビジュアルフロントであり、tool / resource / prompt / skill のいずれも SPA 自身から提供する意義がない。API の実体は volta-auth-proxy 側にある。

## 組み合わせ例

組み合わせ例なし。SPA に MCP ツールを生やしても、向こう側の volta-auth-proxy の API に依存するだけで、他の volta サービスとの有機的な組み合わせをこのリポジトリ経由で行う理由がない。

## 依存と協調

| 相手 repo | 方向 | 能力 | 現在存在 | 備考 |
|-----------|------|------|----------|------|
| volta-auth-proxy | depends_on | 全管理 API（users, tenants, sessions, audit, webhooks, keys, invitations, idp-configs, MFA） | ✅ | SPA の `api.js` が `/api/v1/*` 経由で全操作を委譲。volta-auth-proxy は catalog に登録済み（`operational_status: retired`）だが MCP バックエンドは未持ち。MCP 化するなら向こう側。 |
| volta-auth-proxy | depends_on | 認証フロー（OIDC, session-resume, MFA） | ✅ | tramli の `authFlowDefinition` / `sessionResumeDefinition` はバックエンドの `AuthState` をミラーするだけ。SPA 側に認証ロジックの実体はない。 |
| volta-auth-proxy | depends_on | Monitor ページの SSE/WS（`/viz/auth/stream`, `/viz/flows`, `/viz/ws`） | ✅ | Monitor ページのリアルタイムイベント・フロー定義はバックエンドが供給。SPA は受信して表示するのみ。 |

**協調の必要**: なし。このリポジトリから提供する MCP 入口はない。依存先（volta-auth-proxy）が MCP 化される場合、その survey で対応が検討されるべき。

## ライブラリのサーバ化

該当しない。SPA はライブラリではなく、サーバ化して MCP を載せる価値もない。

## リスク

1. **認証方式の非互換**: SPA は Cookie ベース認証（`credentials: include`）を前提とする。MCP クライアント（エージェント）はブラウザセッションを持たないため、仮にこの SPA の API をラップしても認証クッキー管理が必須になり、MCP のユースケースに合わない。
2. **Dashboard 全件 fetch**: Dashboard が `listUsers`, `adminTenants`, `listAudit` をページネーションなしで全件取得する設計上の問題があり、API をそのまま tool にしても負荷リスクがある。
3. **nginx ハードコード**: `nginx.conf` のバックエンド IP がハードコード（`192.168.1.13:7070`）されており、環境差分が未解決。

## 持ち主への質問

1. volta-auth-proxy の MCP 化を別途計画するか？ その場合、このコンソールの画面定義（SPEC.md の 12 ページ仕様）を `resource://guide` として参照させる形が自然か？
2. volta-auth-proxy は catalog で `operational_status: retired` となっている。後継（volta-auth-server / volta-gateway）に管理 API が移行中の場合、MCP 化の対象はどちらになるか？
