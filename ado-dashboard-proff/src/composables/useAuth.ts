// src/composables/useAuth.ts
import { ref, computed } from 'vue';

const BACKEND_BASE_URL = 'https://two34u882345253.onrender.com';
const API_ENDPOINT = BACKEND_BASE_URL + '/api/dashboard-check';

const STORAGE_KEY = 'app_auth_token';
const STORAGE_EXPIRES_KEY = 'app_auth_expires';

const token = ref<string | null>(null);

function now() { return Date.now(); }
function inThirtyDaysMs() { return 30 * 24 * 60 * 60 * 1000; }

function loadFromStorage() {
    const t = localStorage.getItem(STORAGE_KEY);
    const e = localStorage.getItem(STORAGE_EXPIRES_KEY);
    if (!t || !e) {
        token.value = null;
        clearStorage();
        return;
    }
    const expires = Number(e);
    if (Number.isNaN(expires) || now() > expires) {
        token.value = null;
        clearStorage();
        return;
    }
    token.value = t;
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRES_KEY);
}

loadFromStorage();

export function useAuth() {
    const isAuthenticated = computed(() => !!token.value);

    async function loginWithCode(code: string) {

        if (!code) return { ok: false, error: 'Bitte gib einen Code ein' };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({ password: code })
            });

            if (response.ok) {

                const t = 'tf_' + Math.random().toString(36).slice(2);
                const expires = now() + inThirtyDaysMs();

                token.value = t;
                localStorage.setItem(STORAGE_KEY, t);
                localStorage.setItem(STORAGE_EXPIRES_KEY, String(expires));
                window.dispatchEvent(new Event('auth-changed'));
                return { ok: true };
            }

            const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
            const errorMessage = errorData.error || 'Ungültiger Code';

            return { ok: false, error: errorMessage };

        } catch (error) {

            console.error('Login-Fehler:', error);
            return { ok: false, error: 'Verbindung zum Backend fehlgeschlagen.' };
        }
    }

    function logout() {
        token.value = null;
        clearStorage();
        window.dispatchEvent(new Event('auth-changed'));
    }

    function refreshExpiry() {
        if (!token.value) return;
        const expires = now() + inThirtyDaysMs();
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(expires));
    }


    return {
        token,
        isAuthenticated,
        loginWithCode,
        logout,
        refreshExpiry,
        loadFromStorage
    };
}