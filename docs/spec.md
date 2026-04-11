# volta-auth-console 実装仕様書

## Issue #1: tramli 導入 — 認証状態をフロントエンドでも状態マシンで管理

### 背景
- `src/store/authFlowDefinition.js` に tramli FlowDefinition が既に定義済み
- `@unlaxer/tramli-react` の `useFlow` hook がインストール済み
- しかし authStore.js は tramli を使わず独自に `api.me()` + `api.myTenants()` で認証チェックしている

### 変更内容

#### 1. `src/hooks/useAuthFlow.js` — 新規作成
- `useFlow(sessionResumeDefinition)` をラップ
- tramli フローの state/context を React state として公開
- `ResumeUser`, `ResumeTenants` の FlowKey から認証済みユーザー情報を取得
- フロー完了時に zustand authStore と同期

```
useAuthFlow() → { authState, user, tenants, error, isLoading, resume }
```

#### 2. `src/store/authStore.js` — リファクタ
- `init()` を tramli `sessionResumeDefinition` ベースに変更
- フローの AUTHENTICATED/NO_SESSION terminal state で authenticated フラグを更新
- 後方互換: `user`, `tenants`, `authenticated`, `loading` は同じインターフェース

#### 3. `src/components/AuthFlowStatus.jsx` — 新規作成
- 現在の認証フロー状態を表示するコンポーネント
- ダッシュボードに配置
- 状態: CHECKING → AUTHENTICATED / NO_SESSION
- MFA_PENDING 時は MFA フォームへのリンク表示

### API 変更: なし

---

## Issue #2: /monitor page — リアルタイム認証フロー可視化

### 背景
- `@unlaxer/tramli-viz` はまだ npm 未公開 (tramli#37 待ち)
- `volta-auth-proxy#22` の WebSocket エンドポイントも未完了
- ページの骨組みとフォールバック UI を先行実装

### 変更内容

#### 1. `src/pages/Monitor.jsx` — 新規作成
- `@unlaxer/tramli-viz` が利用可能な場合: `VizDashboard` をレンダリング
- 利用不可の場合: 依存関係のステータスと Coming Soon UI を表示
- WebSocket URL: `wss://${window.location.host}/viz/ws`
- 表示フロー: session, oidc, passkey, mfa, invite
- レイアウト: layered, テーマ: dark

#### 2. `src/components/Sidebar.jsx` — 変更
- 「Monitor」リンクを Settings の前に追加 (icon: 📡)
- admin ロールのみ表示 (user.role === 'ADMIN' || user.role === 'OWNER')

#### 3. `src/App.jsx` — 変更
- `<Route path="/monitor" element={<Monitor />} />` 追加

### API 変更: なし (WebSocket は auth-proxy#22 で提供予定)

---

## Issue #3: ページネーション対応テーブル

### 背景
- volta-auth-proxy#23 で全 admin API にページネーション対応済み
- 現在の DataTable はクライアントサイドで全件取得後にフィルタ/ソート
- サーバーサイドページネーションに移行

### API レスポンス形式 (統一)
```json
{
  "items": [...],
  "total": 1234,
  "page": 1,
  "size": 50,
  "pages": 25
}
```

### 変更内容

#### 1. `src/hooks/usePaginatedQuery.js` — 新規作成
```
usePaginatedQuery(fetchFn, { defaultSize, defaultSort }) → {
  data, total, page, size, pages, isLoading, error,
  setPage, setSize, setSort, setSearch, setFilters, refresh
}
```
- URL パラメータ同期 (useSearchParams)
- debounce 300ms の検索
- ブラウザバック対応

#### 2. `src/components/ServerDataTable.jsx` — 新規作成
サーバーサイドページネーション対応テーブルコンポーネント:
- **Pagination**: `< 1 2 3 ... 25 >` + `Showing 1-50 of 1234`
- **SearchBar**: debounce 300ms, Enter で検索, ESC でクリア
- **SortableHeader**: ヘッダークリックでソート切り替え (▲/▼)
- **page size selector**: 10 / 25 / 50 / 100

#### 3. `src/components/DateRangeFilter.jsx` — 新規作成 (Audit 用)
- from / to 日時ピッカー
- クイック選択: 1h, 24h, 7d, 30d

#### 4. `src/lib/api.js` — 変更
各 API メソッドにクエリパラメータ対応を追加:

| メソッド | 追加パラメータ |
|---------|--------------|
| `listUsers(params)` | `?page=&size=&sort=&q=` |
| `listSessions(params)` | `?page=&size=&user_id=` |
| `listAudit(params)` | `?page=&size=&from=&to=&event=` |
| `listMembers(tid, params)` | `?page=&size=` |
| `listInvitations(tid, params)` | `?page=&size=&status=` |

ヘルパー関数:
```js
function paginated(path, params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([,v]) => v != null))
  ).toString();
  return request(`${path}${qs ? '?' + qs : ''}`);
}
```

#### 5. ページコンポーネント更新

**Users.jsx**
- `usePaginatedQuery` + `ServerDataTable` に切り替え
- 検索: email, name (q パラメータ)
- ソート: email, displayName, createdAt

**Sessions.jsx**
- サーバーサイドページネーション
- user_id フィルタ対応

**Audit.jsx**
- `DateRangeFilter` 追加
- event フィルタ対応
- デフォルト pageSize: 50

**Members.jsx**
- テナント内メンバーのページネーション

**Invitations.jsx**
- status フィルタ (PENDING/USED/EXPIRED)

### 既存 DataTable との関係
- `DataTable` (クライアントサイド) は他のページ (IdP, Webhooks, SigningKeys 等) で引き続き使用
- `ServerDataTable` はサーバーサイドページネーション対応の新コンポーネント
- 両方共存

---

## ファイル変更サマリ

| ファイル | 操作 | Issue |
|---------|------|-------|
| `src/hooks/useAuthFlow.js` | 新規 | #1 |
| `src/store/authStore.js` | 変更 | #1 |
| `src/components/AuthFlowStatus.jsx` | 新規 | #1 |
| `src/pages/Monitor.jsx` | 新規 | #2 |
| `src/components/Sidebar.jsx` | 変更 | #2, #3 |
| `src/App.jsx` | 変更 | #2 |
| `src/hooks/usePaginatedQuery.js` | 新規 | #3 |
| `src/components/ServerDataTable.jsx` | 新規 | #3 |
| `src/components/DateRangeFilter.jsx` | 新規 | #3 |
| `src/lib/api.js` | 変更 | #3 |
| `src/pages/Users.jsx` | 変更 | #3 |
| `src/pages/Sessions.jsx` | 変更 | #3 |
| `src/pages/Audit.jsx` | 変更 | #3 |
| `src/pages/Members.jsx` | 変更 | #3 |
| `src/pages/Invitations.jsx` | 変更 | #3 |
| `src/pages/Dashboard.jsx` | 変更 | #1 |
