import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const hw = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
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

type RetryConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _skipAuthRetry?: boolean;
  _silent?: boolean;
};

let refreshInFlight: Promise<void> | null = null;
let refreshFailedListeners: Array<() => void> = [];

const REFRESH_URL = '/auth/refresh';

function performRefresh(opts: { silent?: boolean } = {}): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = hw
    .post(REFRESH_URL, null, {
      _skipAuthRetry: true,
      _silent: opts.silent === true,
    } as AxiosRequestConfig)
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function isRefreshCall(config?: AxiosRequestConfig): boolean {
  return !!config?.url && config.url.endsWith(REFRESH_URL);
}

hw.interceptors.response.use(
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
          } catch {}
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
    } catch {
      window.dispatchEvent(new CustomEvent('auth-expired'));
      return Promise.reject(error);
    }

    return hw(original);
  },
);

export const ensureCsrf = async (): Promise<void> => {
  if (!getCsrfFromCookie()) {
    await hw.get('/system/csrf/init');
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

export default hw;

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
