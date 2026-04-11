import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  tenants: [],
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
