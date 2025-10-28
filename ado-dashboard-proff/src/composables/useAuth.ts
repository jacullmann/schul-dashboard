// src/composables/useAuth.ts
import { ref, computed } from 'vue';

const BACKEND_BASE_URL = 'https://two34u882345253.onrender.com';
const API_ENDPOINT = BACKEND_BASE_URL + '/api/dashboard-check';

const STORAGE_KEY = 'm38ct09qw3motw3uiholwiu5h4lvzwilizukrejhklgwh';
const STORAGE_EXPIRES_KEY = 'nvzutsjikvthk543htom8s54hvoztw4vzw';

const token = ref<string | null>(null);

const isAuthenticated = ref(false);


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
async function verifyToken() {
    if (!token.value) {
        return false;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/api/verifyall`, {
        headers: {
            Authorization: `Bearer ${token.value}`
        }
    });

    return res.ok;
}


function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRES_KEY);
}



export function useAuth() {

    async function syncAuthState() {
        isAuthenticated.value = await verifyToken();
    }


    async function loginWithCode(code: string) {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: code })
        });

        const data = await response.json();
        if (response.ok && data.token) {
            token.value = data.token;
            const expires = now() + inThirtyDaysMs();
            localStorage.setItem(STORAGE_KEY, data.token);
            localStorage.setItem(STORAGE_EXPIRES_KEY, String(expires));
            window.dispatchEvent(new Event('auth-changed'));
            isAuthenticated.value = true;
            return { ok: true };

        }

        return { ok: false, error: data.error || 'Ungültiger Code' };
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

    setInterval(() => {
        if (token.value) syncAuthState();
    }, 1000 * 30);

    loadFromStorage();
    syncAuthState();

    window.addEventListener('auth-changed', syncAuthState);


    return {
        token,
        isAuthenticated,
        loginWithCode,
        logout,
        refreshExpiry,
        loadFromStorage
    };
}