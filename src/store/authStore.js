import { create } from 'zustand';
import { api } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  tenants: [],
  loading: true,
  error: null,

  init: async () => {
    try {
      const [user, tenants] = await Promise.all([api.me(), api.myTenants()]);
      set({ user, tenants, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
}));
