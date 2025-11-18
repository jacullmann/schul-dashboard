// src/composables/useAuth.ts
import { ref } from 'vue';

const BACKEND_BASE_URL = 'https://two34u882345253.onrender.com';
const API_ENDPOINT = BACKEND_BASE_URL + '/api/dashboard-check';

const STORAGE_KEY = 'm38ct09qw3motw3uiholwiu5h4lvzwilizukrejhklgwh';
const STORAGE_EXPIRES_KEY = 'nvzutsjikvthk543htom8s54hvoztw4vzw';

const token = ref<string | null>(null);

const isAuthenticated = ref(false);
const isAuthReady = ref(false);


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
        isAuthReady.value = true;
    }

    async function initAuth() {
        if (isAuthReady.value) return;

        loadFromStorage();
        await syncAuthState();

        window.addEventListener('auth-changed', syncAuthState);
        setInterval(() => {
            if (token.value) syncAuthState();
        }, 1000 * 30);
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

    async function logout() {
        try {
            console.log('Starting logout process...');
            console.log('Token exists:', !!token.value);

            const response = await fetch(`${BACKEND_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.value}`
                },
                body: JSON.stringify({ message: 'logout' })
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                console.warn("Logout request failed:", response.status, response.statusText);
            }

            const text = await response.text();
            console.log('Response text:', text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (_) {
                data = { raw: text };
            }

            console.log('Parsed data:', data);

        } catch (err) {
            console.error("Logout fetch crashed:", err);
            console.error("Error details:", err.message, err.stack);
        } finally {
            token.value = null;
            clearStorage();
            window.dispatchEvent(new Event('auth-changed'));
            console.log('Local logout completed');
        }
    }


    function refreshExpiry() {
        if (!token.value) return;
        const expires = now() + inThirtyDaysMs();
        localStorage.setItem(STORAGE_EXPIRES_KEY, String(expires));
    }



    return {
        token,
        isAuthenticated,
        isAuthReady,
        loginWithCode,
        logout,
        refreshExpiry,
        loadFromStorage,
        initAuth
    };
}
