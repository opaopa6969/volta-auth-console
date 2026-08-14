import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  tenants: [],
  // いま操作対象にしているテナント。
  //
  // 各ページが `user.tenantId` を読んでいたが、**`/users/me` はそんな項目を
  // 返さない**（返すのは id / email / display_name / locale / created_at）。
  // undefined のまま API を呼ばずに空配列を返す作りだったので、Members と
  // Invitations は**常に空**だった。テナントは `/users/me/tenants` 側にあり、
  // ロールもそこにしか無いので、選択状態をここで持つ。
  currentTenantId: null,
  loading: true,
  error: null,
  authenticated: false,

  // Legacy init — direct API call (fallback if tramli flow is not used)
  init: async () => {
    try {
      const [user, tenants] = await Promise.all([
        api.me(),
        api.myTenants(),
      ]);
      set({
        user,
        tenants: tenants || [],
        currentTenantId: (tenants || [])[0]?.id ?? null,
        loading: false,
        authenticated: true,
      });
    } catch (err) {
      set({
        loading: false,
        error: err.message,
        authenticated: false,
      });
    }
  },

  // tramli flow → zustand sync
  setAuth: (user, tenants) => set({
    user,
    tenants: tenants || [],
    currentTenantId: (tenants || [])[0]?.id ?? null,
    loading: false,
    authenticated: true,
    error: null,
  }),

  setCurrentTenant: (id) => set({ currentTenantId: id }),

  setUnauthenticated: (errorMsg) => set({
    user: null,
    tenants: [],
    currentTenantId: null,
    loading: false,
    authenticated: false,
    error: errorMsg || null,
  }),
}));
