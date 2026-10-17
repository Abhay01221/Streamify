import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-CodeForge-CSRF': '1' },
});
let refresh: Promise<unknown> | null = null;
api.interceptors.response.use(response => response, async error => {
  const original = error.config;
  if (error.response?.status !== 401 || !original || original._retry || original.url?.startsWith('/auth/')) return Promise.reject(error);
  original._retry = true;
  refresh ||= api.post('/auth/refresh').finally(() => { refresh = null; });
  await refresh;
  return api(original);
});
export default api;
