import { create } from 'zustand';

import { register as apiRegister } from '../api/users';

export const useUserStore = create((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isAuthenticating: false,
  authError: null,

  async authenticate() {
    if (get().isAuthenticating) return;
    set({ isAuthenticating: true, authError: null });
    try {
      const response = await apiRegister();
      // Backend returns { user: {...}, role: '...' }
      const user = response?.user ?? response;
      const role = response?.role ?? user?.role ?? 'student';
      set({ user, role, isAuthenticated: true });
    } catch (e) {
      set({ authError: e.message ?? 'Кіру кезінде қате' });
    } finally {
      set({ isAuthenticating: false });
    }
  },

  setUser(user) {
    set({ user, role: user?.role ?? null, isAuthenticated: !!user });
  },

  clear() {
    set({ user: null, role: null, isAuthenticated: false });
  },
}));
