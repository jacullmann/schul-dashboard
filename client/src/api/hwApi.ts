import axios from 'axios';

// ─── CSRF Token (memory-first, non-HttpOnly cookie fallback) ─────────────────
let csrfTokenMemory: string | null = null;

export function setCsrfToken(token: string): void {
    csrfTokenMemory = token;
}

export function getCsrfToken(): string | null {
    if (!csrfTokenMemory) {
        // Fallback: read from the non-HttpOnly csrf_token cookie on first load
        const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
        if (match?.[1]) {
            csrfTokenMemory = decodeURIComponent(match[1]);
        }
    }
    return csrfTokenMemory;
}

/**
 * Force-read the CSRF token from the cookie into memory.
 *
 * Unlike `getCsrfToken()` this always re-reads from `document.cookie`,
 * even if `csrfTokenMemory` is already populated. Use this after operations
 * where the server may have rotated the cookie (e.g. login, MFA verify)
 * but the new token wasn't returned in the response body.
 */
export function syncCsrfFromCookie(): void {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    if (match?.[1]) {
        csrfTokenMemory = decodeURIComponent(match[1]);
    }
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const hw = axios.create({
    baseURL:
        (typeof import.meta !== 'undefined' && import.meta.env
            ? import.meta.env.VITE_HW_API_BASE
            : '') || '',
    // withCredentials ensures the HttpOnly JWT cookie (which contains the
    // active tenant) is sent automatically on every request — no manual
    // header management needed.
    withCredentials: true,
    timeout: 30_000,
});

// ─── Request Interceptor — CSRF only ────────────────────────────────────────
//
// IMPORTANT: We intentionally do NOT attach an x-tenant-id header here.
// The active tenant is encoded in the JWT cookie and extracted server-side.
// This eliminates client/server desync bugs and prevents header-based
// tenant spoofing.

hw.interceptors.request.use(
    (config) => {
        const token = getCsrfToken();
        if (token) {
            config.headers['x-csrf-token'] = token;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ─── CSRF Refresh (singleton, no parallel refresh storms) ───────────────────
let csrfRefreshPromise: Promise<void> | null = null;

async function refreshCsrfToken(): Promise<void> {
    if (csrfRefreshPromise) return csrfRefreshPromise;

    csrfRefreshPromise = (async () => {
        try {
            const baseUrl =
                typeof import.meta !== 'undefined' && import.meta.env
                    ? import.meta.env.VITE_HW_API_BASE
                    : '';
            const { data } = await axios.get(`${baseUrl || ''}/api/system/csrf/init`, {
                withCredentials: true,
            });
            if (data.csrfToken) {
                setCsrfToken(data.csrfToken);
            }
        } finally {
            csrfRefreshPromise = null;
        }
    })();

    return csrfRefreshPromise;
}

// ─── Response Interceptor — error handling ───────────────────────────────────

hw.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Transparent CSRF retry: refresh the token and replay the request once.
        if (error.response?.status === 403 && !originalRequest._csrfRetry) {
            const errorMsg: string = error.response?.data?.error ?? '';
            if (errorMsg.toLowerCase().includes('csrf')) {
                originalRequest._csrfRetry = true;
                try {
                    await refreshCsrfToken();
                    originalRequest.headers['x-csrf-token'] = getCsrfToken();
                    return hw(originalRequest);
                } catch {
                    window.dispatchEvent(new CustomEvent('csrf-refresh-failed'));
                    return Promise.reject(error);
                }
            }
        }

        // Auth session expired — let the app react globally.
        if (error.response?.status === 401 && error.response.data?.requiresAuth) {
            window.dispatchEvent(new CustomEvent('auth-expired'));
        }

        return Promise.reject(error);
    },
);

export default hw;