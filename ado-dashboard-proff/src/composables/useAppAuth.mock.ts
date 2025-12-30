// src/composables/useAppAuth.mock.ts
import { ref } from 'vue';

// Globaler Status für den Mock
const isAuthenticated = ref(true); // Standardmäßig eingeloggt
const isAuthReady = ref(true);     // Auth-Prozess sofort abgeschlossen

export function useAppAuth() {

    // Simuliert die Statusprüfung beim App-Start
    async function checkAuthStatus() {
        console.log('[Mock] checkAuthStatus aufgerufen -> true');
        isAuthenticated.value = true;
        return true;
    }

    // Simuliert die Initialisierung (CSRF etc.)
    async function initAuth() {
        if (isAuthReady.value) return;
        console.log('[Mock] initAuth: Überspringe CSRF-Initialisierung');
        isAuthReady.value = true;
    }

    // Simuliert den Login-Prozess
    async function loginWithCode(code: string) {
        console.log(`[Mock] Login mit Code: ${code}`);
        isAuthenticated.value = true;
        return { ok: true };
    }

    // Simuliert den Logout
    async function logout() {
        console.log('[Mock] Logout aufgerufen');
        isAuthenticated.value = false;
        isAuthReady.value = false;
    }

    return {
        isAuthenticated,
        isAuthReady,
        checkAuthStatus,
        initAuth,
        loginWithCode,
        logout
    };
}