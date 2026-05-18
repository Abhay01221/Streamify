import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Content API
export const contentAPI = {
  getAll: (params?: any) => apiClient.get('/content', { params }),
  getById: (id: string) => apiClient.get(`/content/${id}`),
  getTrending: () => apiClient.get('/content/trending'),
  search: (query: string, params?: any) =>
    apiClient.get('/content/search', { params: { q: query, ...params } }),
};

// User API
export const userAPI = {
  getProfile: () => apiClient.get('/user/profile'),
  updateProfile: (data: any) => apiClient.put('/user/profile', data),
  getFavorites: () => apiClient.get('/user/favorites'),
  addFavorite: (contentId: string) =>
    apiClient.post('/user/favorites', { contentId }),
  removeFavorite: (contentId: string) =>
    apiClient.delete(`/user/favorites/${contentId}`),
  getPlanToWatch: () => apiClient.get('/user/plantowatch'),
  addPlanToWatch: (contentId: string) =>
    apiClient.post('/user/plantowatch', { contentId }),
  removePlanToWatch: (contentId: string) =>
    apiClient.delete(`/user/plantowatch/${contentId}`),
};

// Watch History API
export const watchAPI = {
  getHistory: () => apiClient.get('/watch-progress'),
  updateProgress: (data: any) => apiClient.post('/watch-progress', data),
};

// Subscription API
export const subscriptionAPI = {
  getPlans: () => apiClient.get('/subscription/plans'),
  getStatus: () => apiClient.get('/subscription/status'),
  createCheckout: (plan: string) =>
    apiClient.post('/subscription/create-checkout', { plan }),
  cancel: () => apiClient.post('/subscription/cancel', {}),
};

export default apiClient;
