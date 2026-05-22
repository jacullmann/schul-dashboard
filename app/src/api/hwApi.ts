import axios from 'axios';

const hw = axios.create({
  baseURL: import.meta.env.VITE_HW_API_BASE || '',
  withCredentials: true,
});

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

export const ensureCsrf = async (): Promise<void> => {
  if (!getCsrfFromCookie()) {
    await hw.get('/api/system/csrf/init');
  }
};

export default hw;
