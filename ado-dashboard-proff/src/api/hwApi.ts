import axios from 'axios';

// Memory-basierter CSRF-Token-Store
let csrfTokenMemory: string | null = null;

export function setCsrfToken(token: string): void {
    csrfTokenMemory = token;
}

export function getCsrfToken(): string | null {
    // Fallback: Token aus Cookie lesen falls Memory leer
    if (!csrfTokenMemory) {
        const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
        if (match) {
            csrfTokenMemory = decodeURIComponent(match[1]);
        }
    }
    return csrfTokenMemory;
}

export function syncCsrfFromCookie(): void {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    if (match) {
        csrfTokenMemory = decodeURIComponent(match[1]);
    }
}

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE || '',
    withCredentials: true,
    timeout: 30000
});

hw.interceptors.request.use((config) => {
    const token = getCsrfToken();
    if (token) {
        config.headers['x-csrf-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Flag um Endlos-Retry zu verhindern
let isRefreshingCsrf = false;
let csrfRefreshPromise: Promise<void> | null = null;

async function refreshCsrfToken(): Promise<void> {
    if (isRefreshingCsrf && csrfRefreshPromise) {
        return csrfRefreshPromise;
    }

    isRefreshingCsrf = true;
    csrfRefreshPromise = (async () => {
        try {
            const { data } = await axios.get(
                `${import.meta.env.VITE_HW_API_BASE || ''}/api/csrf/init`,
                { withCredentials: true }
            );
            if (data.csrfToken) {
                setCsrfToken(data.csrfToken);
            }
        } finally {
            isRefreshingCsrf = false;
            csrfRefreshPromise = null;
        }
    })();

    return csrfRefreshPromise;
}

hw.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // CSRF-Fehler abfangen und Retry
        if (error.response?.status === 403 && !originalRequest._csrfRetry) {
            const errorMsg = error.response?.data?.error || '';

            // Nur bei CSRF-spezifischen Fehlern
            if (errorMsg.includes('CSRF') || errorMsg.includes('csrf')) {
                originalRequest._csrfRetry = true;

                try {
                    await refreshCsrfToken();
                    // Token im Request-Header aktualisieren
                    originalRequest.headers['x-csrf-token'] = getCsrfToken();
                    return hw(originalRequest);
                } catch (refreshError) {
                    // CSRF-Refresh fehlgeschlagen
                    window.dispatchEvent(new CustomEvent('csrf-refresh-failed'));
                    return Promise.reject(error);
                }
            }
        }

        // 401-Handling wie bisher
        if (error.response?.status === 401) {
            const errorData = error.response.data;
            if (errorData?.requiresAppGate) {
                window.dispatchEvent(new CustomEvent('app-gate-expired'));
            }
            if (errorData?.requiresLogin) {
                window.dispatchEvent(new CustomEvent('user-token-expired'));
            }
        }

        return Promise.reject(error);
    }
);

export default hw;