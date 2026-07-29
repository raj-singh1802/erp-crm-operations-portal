import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onLogout: (() => void) | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnLogout(cb: () => void) {
  onLogout = cb;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;
      try {
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        );
        accessToken = res.data.accessToken;
        refreshToken = res.data.refreshToken;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        console.error('Token refresh failed, redirecting to login:', err);
        clearTokens();
        if (onLogout) onLogout();
        alert('Your session has expired. Please sign in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
