// src/composables/useAppAuth.ts

import { ref } from 'vue';
import hw from '../hwApi';

const API_ENDPOINT = '/api/app-gate/login';
const STATUS_ENDPOINT = '/api/app-gate/status';

const isAuthenticated = ref(false);
const isAuthReady = ref(false);
let initPromise: Promise<void> | null = null;
let eventListenerRegistered = false;

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
            try {
                await hw.get('/api/csrf/init');
            } catch (e) {
                console.warn('CSRF init failed:', e);
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
                isAuthenticated.value = true;
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