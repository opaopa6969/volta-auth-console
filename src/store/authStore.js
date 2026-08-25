import { create } from 'zustand';

// 選択中テナントの永続化 (#26)。
// 複数テナントの管理者が画面を開き直すたびに別テナントを見てしまうのを防ぐ。
const TENANT_KEY = 'volta_selected_tenant';

const readStoredTenant = () => {
  try {
    return localStorage.getItem(TENANT_KEY) || null;
  } catch {
    return null; // localStorage が使えない環境（Safari private 等）
  }
};

export const useAuthStore = create((set, get) => ({
  user: null,
  tenants: [],
  loading: true,
  error: null,
  authenticated: false,

  // #26: テナント固有ページ（Members / Invitations / Webhooks / IdP / Users の
  // MFA リセット）は user.tenantId を暗黙に使っていた。複数テナントの管理者から
  // 見ると「どのテナントを操作しているのか」が画面のどこにも出ない。
  // 明示的な選択状態を1箇所に持ち、UI（Sidebar）で切り替えられるようにする。
  selectedTenantId: readStoredTenant(),

  setSelectedTenantId: (tenantId) => {
    try {
      if (tenantId) localStorage.setItem(TENANT_KEY, tenantId);
      else localStorage.removeItem(TENANT_KEY);
    } catch {
      // 永続化できなくても画面は動く
    }
    set({ selectedTenantId: tenantId || null });
  },

  /** 実際に API へ渡すテナント ID。選択 → user.tenantId → 所属の先頭。 */
  currentTenantId: () => {
    const { selectedTenantId, tenants, user } = get();
    if (selectedTenantId && tenants.some(t => (t.id || t.tenantId) === selectedTenantId)) {
      return selectedTenantId;
    }
    return user?.tenantId || tenants[0]?.id || tenants[0]?.tenantId || null;
  },

  // tramli flow → zustand sync
  setAuth: (user, tenants) => set({
    user,
    tenants: tenants || [],
    loading: false,
    authenticated: true,
    error: null,
  }),

  setUnauthenticated: (errorMsg) => set({
    user: null,
    tenants: [],
    loading: false,
    authenticated: false,
    error: errorMsg || null,
  }),
}));
