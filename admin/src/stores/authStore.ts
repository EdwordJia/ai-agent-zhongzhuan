import { create } from 'zustand';

interface AuthState {
  token: string | null;
  admin: { username: string; role: string } | null;
  isAuthenticated: boolean;
  login: (token: string, admin: { username: string; role: string }) => void;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  admin: null,
  isAuthenticated: false,

  login: (token, admin) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(admin));
    set({ token, admin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ token: null, admin: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  init: () => {
    const token = localStorage.getItem('admin_token');
    const adminStr = localStorage.getItem('admin_user');
    if (token && adminStr) {
      try {
        const admin = JSON.parse(adminStr);
        set({ token, admin, isAuthenticated: true });
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
  },
}));
