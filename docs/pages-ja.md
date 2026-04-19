[English version](pages.md)

# 画面一覧 — volta-auth-console

12 画面それぞれの役割と呼び出す API エンドポイント。

---

## Dashboard (`/`)

**役割**: 現在認証中のユーザーのコンテキストと認証フロー状態の概要。

**コンポーネント**:
- `AuthFlowStatus` — 現在の tramli ステート（`CHECKING` / `AUTHENTICATED` / `NO_SESSION`）を表示
- サマリ統計（ユーザー数、テナント数）

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/users/me` | 現在のユーザー（sessionResumeDefinition 経由） |
| GET | `/api/v1/users/me/tenants` | ユーザーのテナント（sessionResumeDefinition 経由） |

---

## Users (`/users`)

**役割**: プラットフォーム全体のユーザーを一覧・検索する。ADMIN/OWNER のみ。

**機能**: サーバーサイドページネーション、email/name 検索、email/displayName/createdAt ソート。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/admin/users?page=&size=&sort=&q=` | ページネーション付きユーザー一覧 |

---

## Tenants (`/tenants`)

**役割**: 全テナントの一覧表示・停止・有効化。ADMIN/OWNER のみ。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/admin/tenants` | 全テナント取得 |
| POST | `/api/v1/admin/tenants/:tid/suspend` | テナント停止 |
| POST | `/api/v1/admin/tenants/:tid/activate` | テナント有効化 |

---

## Members (`/members`)

**役割**: 現在のテナント内のメンバーを表示・管理する。

**機能**: サーバーサイドページネーション、ロール変更。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/tenants/:tid/members?page=&size=` | ページネーション付きメンバー一覧 |
| PATCH | `/api/v1/tenants/:tid/members/:mid` | メンバーロール更新 |
| DELETE | `/api/v1/tenants/:tid/members/:uid/mfa` | メンバー MFA リセット |

---

## Invitations (`/invitations`)

**役割**: 現在のテナントの招待を管理する。送信・閲覧・削除。

**機能**: サーバーサイドページネーション、ステータスフィルタ（PENDING / USED / EXPIRED）。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/tenants/:tid/invitations?page=&size=&status=` | ページネーション付き招待一覧 |
| POST | `/api/v1/tenants/:tid/invitations` | 招待作成 |
| DELETE | `/api/v1/tenants/:tid/invitations/:iid` | 招待削除 |

---

## Sessions (`/sessions`)

**役割**: プラットフォーム全体のアクティブセッションを閲覧・失効させる。ADMIN/OWNER のみ。

**機能**: サーバーサイドページネーション、user_id フィルタ。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/admin/sessions?page=&size=&user_id=` | ページネーション付きセッション一覧 |
| GET | `/api/me/sessions` | 現在のユーザー自身のセッション |
| DELETE | `/auth/sessions/:id` | セッション失効 |

> **API 非統一**: `/api/me/sessions` と `/auth/sessions/:id` は `/api/v1/` プレフィックスから逸脱 — 整理対象として追跡中。

---

## Audit (`/audit`)

**役割**: プラットフォーム全体のイベント監査ログを閲覧する。ADMIN/OWNER のみ。

**機能**: サーバーサイドページネーション（デフォルトサイズ 50）、日時範囲フィルタ、イベントタイプフィルタ。

**コンポーネント**: `DateRangeFilter` — クイック選択: 1h, 24h, 7d, 30d; またはカスタム from/to。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/admin/audit?page=&size=&from=&to=&event=` | ページネーション付き監査ログ |

---

## IdpConfig (`/idp`)

**役割**: 現在のテナントの ID プロバイダー（OIDC、SAML）を設定する。OWNER のみ。

**機能**: クライアントサイド `DataTable`（上限のあるデータセット）。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/tenants/:tid/idp-configs` | IdP 設定一覧 |

---

## Webhooks (`/webhooks`)

**役割**: 現在のテナントの Webhook を作成・編集・削除し、配信履歴を閲覧する。OWNER のみ。

**機能**: クライアントサイド `DataTable`。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/tenants/:tid/webhooks` | Webhook 一覧 |
| POST | `/api/v1/tenants/:tid/webhooks` | Webhook 作成 |
| PATCH | `/api/v1/tenants/:tid/webhooks/:wid` | Webhook 更新 |
| DELETE | `/api/v1/tenants/:tid/webhooks/:wid` | Webhook 削除 |
| GET | `/api/v1/tenants/:tid/webhooks/:wid/deliveries` | 配信履歴 |

---

## SigningKeys (`/keys`)

**役割**: アクティブな署名鍵を閲覧し、ローテーションをトリガーする。ADMIN のみ。

**機能**: クライアントサイド `DataTable`。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/admin/keys` | 署名鍵一覧 |
| POST | `/api/v1/admin/keys/rotate` | 鍵ローテーション |

---

## Settings (`/settings`)

**役割**: テナントレベルの設定（表示名・許可ドメインなど）を管理する。OWNER のみ。

**API**:
| メソッド | エンドポイント | 用途 |
|--------|------------|-----|
| GET | `/api/v1/tenants/:tid` | テナント詳細取得 |
| PATCH | `/api/v1/tenants/:tid` | テナント設定更新 |

---

## Monitor (`/monitor`)

**役割**: volta-auth-proxy で実行中の tramli 認証フローをリアルタイム可視化する。ADMIN/OWNER のみ。

**ステータス**: ブロック中 — [docs/monitor-page-ja.md](monitor-page-ja.md) 参照。

**ブロッカー**:
- **tramli#37** — `@unlaxer/tramli-viz` が npm に未公開
- **volta-auth-proxy#22** — WebSocket エンドポイントが未実装

**フォールバック UI**: どちらかのブロッカーが未解決の場合、不足している依存関係と推定スケジュールを示すステータスパネルを表示する。
