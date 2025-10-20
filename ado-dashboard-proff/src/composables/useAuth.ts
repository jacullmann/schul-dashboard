// src/composables/useAuth.ts
import { ref, computed } from 'vue';

const STORAGE_KEY = 'app_auth_token';
const STORAGE_EXPIRES_KEY = 'app_auth_expires';
// const FRONTEND_CODE = 'mynewjamaicanlawyer'; // <-- ENTFERNT: Code-Prüfung erfolgt jetzt im Backend

const token = ref<string | null>(null);

function now() { return Date.now(); }
function inThirtyDaysMs() { return 30 * 24 * 60 * 60 * 1000; } // 30 Tage in Millisekunden

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

    // NEU: Funktion ist jetzt async und ruft das Backend auf
    async function loginWithCode(code: string) {
        if (!code) return { ok: false, error: 'Bitte gib einen Code ein' };

        try {
            const response = await fetch('/api/auth/access-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (!response.ok) {
                // Fehler vom Backend, z.B. 401 Ungültiger Zugangscode
                return { ok: false, error: data.message || 'Login fehlgeschlagen. Bitte Code prüfen.' };
            }

            // Erfolg: Token speichern
            const t = data.token; // Erhaltener JWT vom Backend

            // Die Ablaufzeit (30d) wird im Backend gesetzt, wir speichern die lokale Expiry
            const expires = now() + inThirtyDaysMs();

            token.value = t;
            localStorage.setItem(STORAGE_KEY, t);
            localStorage.setItem(STORAGE_EXPIRES_KEY, String(expires));
            window.dispatchEvent(new Event('auth-changed'));

            return { ok: true };

        } catch (err) {
            console.error('Backend access-code call failed', err);
            return { ok: false, error: 'Netzwerkfehler oder Server nicht erreichbar' };
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

    // expose
    return {
        token,
        isAuthenticated,
        loginWithCode,
        logout,
        refreshExpiry,
        loadFromStorage
    };
}