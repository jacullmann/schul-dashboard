import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { isSessionRejected } from './errors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});

const getCsrfFromCookie = (): string | null => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

api.interceptors.request.use((config) => {
  const token = getCsrfFromCookie();
  if (token) config.headers['x-csrf-token'] = token;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _skipAuthRetry?: boolean;
  _silent?: boolean;
};

let refreshInFlight: Promise<void> | null = null;
let refreshFailedListeners: Array<() => void> = [];

const REFRESH_URL = '/auth/refresh';
const REFRESH_LOCK = 'auth-refresh';
const LAST_REFRESH_KEY = 'auth:last-refresh';
// Bounds how long other tabs can be stuck waiting on the refresh lock.
const REFRESH_TIMEOUT_MS = 15_000;

const readLastRefresh = (): number => {
  try {
    return Number(localStorage.getItem(LAST_REFRESH_KEY)) || 0;
  } catch {
    return 0;
  }
};

const recordRefresh = (): void => {
  try {
    localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
  } catch {
    // Without storage, a waiting tab just refreshes again, which stays valid.
  }
};

const postRefresh = async (silent: boolean): Promise<void> => {
  await api.post(REFRESH_URL, null, {
    _skipAuthRetry: true,
    _silent: silent,
    timeout: REFRESH_TIMEOUT_MS,
  } as AxiosRequestConfig);
  recordRefresh();
};

// Refresh tokens rotate on every use and share one cookie across tabs, so
// refreshes are serialized browser-wide. A tab that waited on another tab's
// refresh reuses the cookies it set instead of rotating them again.
async function refreshAcrossTabs(silent: boolean): Promise<void> {
  if (!navigator.locks) return postRefresh(silent);

  const requestedAt = Date.now();
  await navigator.locks.request(REFRESH_LOCK, async () => {
    if (readLastRefresh() >= requestedAt) return;
    await postRefresh(silent);
  });
}

function performRefresh(opts: { silent?: boolean } = {}): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = refreshAcrossTabs(opts.silent === true).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function isRefreshCall(config?: AxiosRequestConfig): boolean {
  return !!config?.url && config.url.endsWith(REFRESH_URL);
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (!original || status !== 401) {
      return Promise.reject(error);
    }

    if (isRefreshCall(original) || original._skipAuthRetry) {
      if (!original._silent) {
        window.dispatchEvent(new CustomEvent('auth-expired'));
        refreshFailedListeners.forEach((fn) => {
          try {
            fn();
          } catch {
            // A listener must not stop the others from being notified.
          }
        });
      }
      return Promise.reject(error);
    }

    if (original._retried) {
      window.dispatchEvent(new CustomEvent('auth-expired'));
      return Promise.reject(error);
    }
    original._retried = true;

    try {
      await performRefresh();
    } catch (refreshError) {
      // An unreachable or failing API (e.g. restarting during a deploy) leaves
      // the refresh cookie valid, so only a rejected refresh ends the session.
      if (isSessionRejected(refreshError)) {
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }
      return Promise.reject(error);
    }

    return api(original);
  },
);

export const ensureCsrf = async (): Promise<void> => {
  if (!getCsrfFromCookie()) {
    await api.get('/system/csrf/init');
  }
};

export const refreshSession = (
  opts: { silent?: boolean } = {},
): Promise<void> => performRefresh(opts);

export const onRefreshFailed = (fn: () => void): (() => void) => {
  refreshFailedListeners.push(fn);
  return () => {
    refreshFailedListeners = refreshFailedListeners.filter((f) => f !== fn);
  };
};

export default api;

declare module 'axios' {
  export interface AxiosRequestConfig {
    _skipAuthRetry?: boolean;
    _silent?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _skipAuthRetry?: boolean;
    _retried?: boolean;
    _silent?: boolean;
  }
}
