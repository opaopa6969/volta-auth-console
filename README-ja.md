[English version](README.md)

# volta-auth-console

[volta-auth-proxy](https://github.com/opaopa6969/volta-auth-proxy) 管理用 SPA — **React 19 + Vite 8** 製。

認証状態はフロントエンドでも tramli ステートマシン (`authFlowDefinition`) として管理し、volta-auth-proxy Java 側の `AuthState` と対称的な構造を取る。

---

## 目次

- [概要](#概要)
- [12 画面](#12-画面)
- [クイックスタート](#クイックスタート)
- [プロジェクト構造](#プロジェクト構造)
- [認証フロー (tramli)](#認証フロー-tramli)
- [API 境界](#api-境界)
- [nginx.conf](#nginxconf)
- [既知の問題](#既知の問題)
- [ドキュメント](#ドキュメント)

---

## 概要

| 項目 | 値 |
|------|-----|
| フレームワーク | React 19 + Vite 8 |
| ルーティング | react-router-dom v7（devDep — [既知の問題](#既知の問題)参照） |
| 状態管理 | zustand v5（devDep — [既知の問題](#既知の問題)参照） |
| 認証ステートマシン | @unlaxer/tramli + @unlaxer/tramli-react |
| スタイリング | Tailwind CSS v4 |
| バックエンド | volta-auth-proxy（nginx 経由でプロキシ） |

---

## 12 画面

| ルート | ページ | 役割 |
|--------|--------|------|
| `/` | Dashboard | 認証フロー状態・サマリ統計 |
| `/users` | Users | サーバーページネーション付きユーザー一覧・検索 |
| `/tenants` | Tenants | テナント一覧・停止/有効化 |
| `/members` | Members | テナント別メンバー管理 |
| `/invitations` | Invitations | 招待管理・ステータスフィルタ |
| `/sessions` | Sessions | アクティブセッション一覧・失効 |
| `/audit` | Audit | イベントログ・日時範囲フィルタ |
| `/idp` | IdpConfig | テナント別 IdP 設定 |
| `/webhooks` | Webhooks | Webhook CRUD + 配信履歴 |
| `/keys` | SigningKeys | 署名鍵一覧・ローテーション |
| `/settings` | Settings | テナントレベル設定 |
| `/monitor` | Monitor | tramli-viz リアルタイムフロー（SSE + WebSocket） |

---

## クイックスタート

```bash
# 1. インストール
npm install

# 2. 開発サーバー起動（認証クッキー用に大きなヘッダーサイズが必要）
npm run dev
# → http://localhost:3400

# 3. ビルド
npm run build
```

開発時は volta-auth-proxy が起動・到達可能である必要がある。詳細は [docs/getting-started-ja.md](docs/getting-started-ja.md) 参照。

---

## プロジェクト構造

```
src/
  App.jsx                    # ルート + 認証ガード
  pages/                     # 12 画面コンポーネント
  components/
    Sidebar.jsx              # ナビゲーション（Monitor: ADMIN/OWNER のみ表示）
    AuthFlowStatus.jsx       # 現在の tramli 状態表示
    ServerDataTable.jsx      # サーバーサイドページネーションテーブル
    DateRangeFilter.jsx      # Audit 用日時範囲ピッカー
  hooks/
    useAuthFlow.js           # tramli session-resume ラッパー
    usePaginatedQuery.js     # URL 同期ページネーションフック
  store/
    authStore.js             # zustand 認証ストア
    authFlowDefinition.js    # tramli FlowDefinition（auth + session-resume）
  lib/
    api.js                   # API クライアント（API 境界参照）
```

---

## 認証フロー (tramli)

`src/store/authFlowDefinition.js` に 2 つのフローを定義:

### `authFlowDefinition` — 10 ステート OIDC フロー

```
UNAUTHENTICATED → LOGIN_REDIRECT → LOGIN_PENDING
  → CALLBACK_RECEIVED → USER_RESOLVED
  → [SESSION_CREATED | MFA_PENDING] → SESSION_CREATED
  → COMPLETE
  → FAILED / EXPIRED（終端エラー）
```

volta-auth-proxy の Java 側 `AuthState` と対称的。フロントエンドは OIDC トークン交換自体は行わず、バックエンドが**どのフェーズにいるか**を追跡する。

### `sessionResumeDefinition` — 2 ステート再開確認フロー

```
CHECKING → AUTHENTICATED（終端）
         → NO_SESSION（終端）
```

アプリマウント時に `useAuthFlow()` で呼び出される。成功時は `ResumeUser` / `ResumeTenants` を zustand `authStore` に同期する。

---

## API 境界

API クライアント (`src/lib/api.js`) は 3 つのパスプレフィックスを使用し、すべて volta-auth-proxy にプロキシされる:

| プレフィックス | 用途 | 備考 |
|--------------|------|------|
| `/api/v1/` | 管理・テナント API | 大半のエンドポイントで使用するメインプレフィックス |
| `/api/v1/` | ユーザー自身用 API | `mySessions` と `revokeSession` もこのプレフィックス配下 |
| `/auth/` | 認証アクション | ログイン・ForwardAuth などの認証操作のみ |

セッション一覧・失効エンドポイントは現行実装で `/api/v1/users/me/sessions` 配下に統一されている。旧 `/api/me/sessions` と `/auth/sessions/:id` はバックエンドの後方互換ルートとして残るが、この SPA からは呼び出さない。

---

## nginx.conf

`nginx.conf` はすべての `/api/`・`/auth/`・`/.well-known/` トラフィックを volta-auth-proxy にプロキシする。

**バックエンド IP はハードコードされている**（`192.168.1.13:7070` は例）。デプロイ前に変更すること:

```nginx
proxy_pass http://192.168.1.13:7070;   # ← 実際のホストに変更
```

本番環境では環境変数または named upstream ブロックの使用を推奨。[docs/architecture-ja.md](docs/architecture-ja.md#nginxconf) 参照。

---

## 既知の問題

### react-router-dom / zustand が devDependencies に誤配置

`react-router-dom` と `zustand` が `package.json` の `devDependencies` に記載されている。両方とも**ランタイム依存関係**であり、公開またはコンテナ化する前に `dependencies` へ移動すること。Vite がすべてバンドルするため開発・ビルドでは動作するが、ダウンストリームの利用者に対して誤解を招く。

### Monitor ページ

`/monitor` ページは npm 公開済みの `@unlaxer/tramli-viz@0.2.0` を使い、
フローテレメトリ用の `/viz/ws` に接続する。`/viz/auth/stream` の SSE フィードと
`/viz/flows` のフロー定義も利用する。

---

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [docs/architecture-ja.md](docs/architecture-ja.md) | システムアーキテクチャ・認証フロー・nginx・API 境界 |
| [docs/getting-started-ja.md](docs/getting-started-ja.md) | 開発環境構築・プロキシ接続 |
| [docs/pages-ja.md](docs/pages-ja.md) | 各画面の役割と API 対応 |
| [docs/monitor-page-ja.md](docs/monitor-page-ja.md) | Monitor ページの設計とブロッカー |
| [docs/decisions/](docs/decisions/) | アーキテクチャ決定記録 |
| [CHANGELOG.md](CHANGELOG.md) | バージョン履歴 |
