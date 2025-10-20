// src/composables/useAuth.ts
import { ref, computed } from 'vue';

const STORAGE_KEY = 'app_auth_token';
const STORAGE_EXPIRES_KEY = 'app_auth_expires';

const token = ref<string | null>(null);

function now() { return Date.now(); }
function inThirtyDaysMs() { return 30 * 24 * 60 * 60 * 1000; }

function loadFromStorage() {
    const t = localStorage.getItem(STORAGE_KEY);
    const e = localStorage.getItem(STORAGE_EXPIRES_KEY);
    if (!t || !e) { token.value = null; clearStorage(); return; }
    const expires = Number(e);
    if (Number.isNaN(expires) || now() > expires) { token.value = null; clearStorage(); return; }
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
            const resp = await fetch('/api/auth/code-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await resp.json();
            if (!resp.ok) {
                return { ok: false, error: data?.error || 'Ungültiger Code' };
            }

            // success
            const t = data.token;
            const expires = now() + inThirtyDaysMs();
            token.value = t;
            localStorage.setItem(STORAGE_KEY, t);
            localStorage.setItem(STORAGE_EXPIRES_KEY, String(expires));
            window.dispatchEvent(new Event('auth-changed'));
            return { ok: true };
        } catch (err) {
            console.error('loginWithCode error', err);
            return { ok: false, error: 'Netzwerkfehler' };
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
