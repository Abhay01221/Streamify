import { create } from 'zustand';

interface AuthStore {
  isAuthenticated: boolean;
  user: any | null;
  setUser: (user: any) => void;
  setIsAuthenticated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (value: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
}));

interface PlayerStore {
  currentContentId: string | null;
  currentEpisodeId: string | null;
  isPlaying: boolean;
  setCurrentContent: (contentId: string, episodeId?: string) => void;
  setIsPlaying: (value: boolean) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentContentId: null,
  currentEpisodeId: null,
  isPlaying: false,
  setCurrentContent: (contentId, episodeId) =>
    set({ currentContentId: contentId, currentEpisodeId: episodeId }),
  setIsPlaying: (value) => set({ isPlaying: value }),
}));

interface SearchStore {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: {
    type?: string;
    genre?: string;
    year?: number;
    rating?: number;
    language?: string;
  };
  setFilters: (filters: SearchStore['filters']) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  filters: {},
  setFilters: (filters) => set({ filters }),
}));
