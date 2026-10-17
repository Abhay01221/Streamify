import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isPremium: boolean;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    website?: string;
    country?: string;
  };
  stats?: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    contestRating: number;
  };
  streak?: {
    currentStreak: number;
    longestStreak: number;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ requiresTwoFactor?: boolean; tempToken?: string }>;
  logout: () => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
}

let initialization: Promise<void> | null = null;
let authRevision = 0;

export const useAuthStore = create<AuthState>()((set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,

      initialize: () => {
        // App startup and an OAuth callback can mount together. A single
        // refresh prevents both requests from rotating the same refresh token.
        if (initialization) return initialization;
        const revision = authRevision;
        initialization = (async () => {
          localStorage.removeItem('coders-auth');
          try {
            const token = get().accessToken;
            if (!token) {
              const res = await api.post('/auth/refresh');
              if (authRevision !== revision) return;
              set({ accessToken: res.data.accessToken });
            }
            const me = await api.get('/auth/me');
            if (authRevision !== revision) return;
            set({ user: me.data, isLoading: false });
          } catch {
            if (authRevision !== revision) return;
            set({ user: null, accessToken: null, isLoading: false });
          }
        })().finally(() => { initialization = null; });
        return initialization;
      },

      login: async (email, password, rememberMe = false) => {
        const res = await api.post('/auth/login', { email, password, rememberMe });
        if (res.data.requiresTwoFactor) {
          return { requiresTwoFactor: true, tempToken: res.data.tempToken };
        }
        authRevision++;
        set({ user: res.data.user, accessToken: res.data.accessToken, isLoading: false });
        return {};
      },

      logout: async () => {
        authRevision++;
        try {
          await api.post('/auth/logout');
        } finally {
          localStorage.removeItem('coders-auth');
          set({ user: null, accessToken: null, isLoading: false });
        }
      },

      register: async (email, username, password) => {
        await api.post('/auth/register', { email, username, password });
      },

      refreshUser: async () => {
        const me = await api.get('/auth/me');
        set({ user: me.data });
      },

      setUser: (user) => { authRevision++; set({ user, isLoading: false }); },
      setAccessToken: (token) => { authRevision++; set({ accessToken: token }); },
    })
);
