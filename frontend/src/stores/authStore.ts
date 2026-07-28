import { create } from 'zustand';
import type { User } from '../types';
import api, { setTokens, clearTokens, setOnLogout } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setTokens(res.data.accessToken, res.data.refreshToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  setUser: (user: User) => set({ user, isAuthenticated: true }),
}));

setOnLogout(() => {
  clearTokens();
  useAuthStore.getState().logout();
});
