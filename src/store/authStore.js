import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  tenants: [],
  loading: true,
  error: null,
  authenticated: false,

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
