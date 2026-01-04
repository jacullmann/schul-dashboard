// src/composables/useAppAuth.ts

import { ref } from 'vue';
import axios from 'axios';
import hw, { setCsrfToken } from '../hwApi';

const API_ENDPOINT = '/api/app-gate/login';
const STATUS_ENDPOINT = '/api/app-gate/status';

const isAuthenticated = ref(false);
const isAuthReady = ref(false);
let initPromise: Promise<void> | null = null;
let eventListenerRegistered = false;
const MAX_CSRF_RETRIES = 3;
const CSRF_RETRY_DELAY = 1000;

export function useAppAuth() {
    async function checkAuthStatus() {
        try {
            const { data } = await hw.get(STATUS_ENDPOINT);
            isAuthenticated.value = data.authenticated === true;
            return data.authenticated;
        } catch (err) {
            console.error('Überprüfung der Authentifizierung fehlgeschlagen:', err);
            isAuthenticated.value = false;
            return false;
        }
    }

    async function initAuth() {
        if (isAuthReady.value) return;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            let csrfInitialized = false;
            for (let attempt = 1; attempt <= MAX_CSRF_RETRIES; attempt++) {
                try {
                    const { data } = await axios.get(
                        `${import.meta.env.VITE_HW_API_BASE}/api/csrf/init`,
                        { withCredentials: true }
                    );
                    if (data.csrfToken) {
                        setCsrfToken(data.csrfToken);
                        csrfInitialized = true;
                        break;
                    }
                } catch (e) {
                    console.warn(`CSRF init attempt ${attempt}/${MAX_CSRF_RETRIES} failed:`, e);
                    if (attempt < MAX_CSRF_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, CSRF_RETRY_DELAY));
                    }
                }
            }
            if (!csrfInitialized) {
                console.error('CSRF initialization failed after all retries');
                window.dispatchEvent(new CustomEvent('csrf-init-failed'));
            }
            await checkAuthStatus();
            isAuthReady.value = true;

            if (!eventListenerRegistered) {
                window.addEventListener('app-gate-expired', () => {
                    isAuthenticated.value = false;
                });
                eventListenerRegistered = true;
            }
        })();

        await initPromise;
    }

    async function loginWithCode(code: string) {
        try {
            const response = await hw.post(API_ENDPOINT, {
                password: code
            });

            if (response.status === 200 && response.data.ok) {
                if (response.data.csrfToken) {
                    setCsrfToken(response.data.csrfToken);
                } else {
                    syncCsrfFromCookie();
                }
                isAuthenticated.value = true;
                window.dispatchEvent(new CustomEvent('app-gate-authenticated'));
                return { ok: true };
            }

            return { ok: false, error: 'Login fehlgeschlagen' };
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Ungültiger Code';
            return { ok: false, error: errorMsg };
        }
    }

    async function logout() {
        try {
            await hw.post('/api/app-gate/logout');
        } catch (err) {
            console.error('Logout-Request fehlgeschlagen:', err);
        } finally {
            isAuthenticated.value = false;
            isAuthReady.value = false;
            initPromise = null;
        }
    }

    return {
        isAuthenticated,
        isAuthReady,
        loginWithCode,
        logout,
        initAuth,
        checkAuthStatus,
    };
}