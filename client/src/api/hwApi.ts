import axios from 'axios';

const hw = axios.create({
  baseURL: import.meta.env.VITE_HW_API_BASE || '',
  withCredentials: true,
});

// Reads the CSRF token from the `csrf_token` cookie
const getCsrfFromCookie = (): string | null => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

hw.interceptors.request.use((config) => {
  const token = getCsrfFromCookie();
  if (token) config.headers['x-csrf-token'] = token;
  return config;
});

hw.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    return Promise.reject(error);
  },
);

/**
 * Ensures the CSRF cookie is present.
 * Calls the backend init endpoint if the cookie is missing (e.g. first visit).
 */
export const ensureCsrf = async (): Promise<void> => {
  if (!getCsrfFromCookie()) {
    await hw.get('/api/system/csrf/init');
  }
};

/**
 * No-op: the request interceptor always reads the CSRF token fresh from the
 * cookie, so there is no local token state to sync or set manually.
 * These exports exist only for call-site compatibility.
 */
export const syncCsrfFromCookie = (): void => {};
export const setCsrfToken = (_token: string): void => {};

export default hw;
