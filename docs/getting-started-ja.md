[English version](getting-started.md)

# はじめに — volta-auth-console

## 前提条件

| 要件 | バージョン |
|------|----------|
| Node.js | 20 以上 |
| npm | 10 以上 |
| volta-auth-proxy | 起動済みで到達可能 |

---

## 1. インストール

```bash
cd volta-auth-console
npm install
```

---

## 2. volta-auth-proxy に接続する

SPA はすべての `/api/`・`/auth/`・`/.well-known/` リクエストを volta-auth-proxy にプロキシする。開発時は Vite の開発サーバーが `vite.config.js` の設定でこれを処理する。

`vite.config.js` にローカルの volta-auth-proxy を指すプロキシブロックがあるか確認:

```js
// vite.config.js（例）
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:7070',
      '/auth': 'http://localhost:7070',
      '/.well-known': 'http://localhost:7070',
    },
  },
});
```

volta-auth-proxy が別のホスト/ポートで動いている場合はプロキシターゲットを変更すること。

> **注意**: `npm run dev` の `NODE_OPTIONS='--max-http-header-size=65536'` フラグは必須。volta-auth-proxy が Node のデフォルトヘッダーサイズ制限を超える大きな認証クッキーを送るため。

---

## 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:5173](http://localhost:5173) を開く。volta-auth-proxy に到達できる場合、ログインページにリダイレクトされ、認証後に Dashboard に遷移する。

---

## 4. 本番向けビルド

```bash
npm run build
```

出力は `dist/` ディレクトリに生成される。付属の `nginx.conf` を使って nginx で配信する。

**デプロイ前に** `nginx.conf` のハードコードされたバックエンド IP を変更すること:

```nginx
proxy_pass http://192.168.1.13:7070;  # ← 実際の host:port に変更
```

環境変数を使った推奨アプローチは [docs/architecture-ja.md#nginxconf](architecture-ja.md#nginxconf) 参照。

---

## 5. 初回ロード時の認証フロー

マウント時に `sessionResumeDefinition` tramli フローが実行される:

```
CHECKING → api.me() + api.myTenants()（並列）
  ├── 200 OK  → AUTHENTICATED — SPA を表示
  └── 401     → NO_SESSION    → /login?return_to=<現在のパス> にリダイレクト
```

手動でのトークン管理は不要。セッションは Cookie ベースで、volta-auth-proxy が発行・検証する。

---

## 6. ロールベースアクセス

Sidebar は `ADMIN` または `OWNER` ロールのユーザーにのみ **Monitor** リンクを表示する。他の画面はページコンポーネント自身でロールチェックを行う。ロールは zustand `authStore` の `user` オブジェクト（`api.me()` レスポンスから取得）に含まれる。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| 白画面でリダイレクトされない | volta-auth-proxy に到達できない | vite.config.js のプロキシターゲットを確認 |
| `431 Request Header Fields Too Large` | `NODE_OPTIONS` が未設定 | `vite` 直接実行ではなく `npm run dev` を使う |
| 認証ループ（リダイレクト → ログイン → リダイレクト） | Cookie のドメインが一致しない | 開発サーバーとプロキシが同じオリジンか確認 |
| Monitor ページが "Coming Soon" を表示 | tramli#37 または volta-auth-proxy#22 が未解決 | 想定動作 — [docs/monitor-page-ja.md](monitor-page-ja.md) 参照 |
