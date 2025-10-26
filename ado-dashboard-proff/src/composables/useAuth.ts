// src/composables/useAuth.ts
import { ref, computed } from 'vue';
import router from '@/router'; // Importiert den Router für Weiterleitungen

// Verwenden Sie Ihre BASE_URL aus der Umgebungsvariable
const API_BASE_URL = import.meta.env.VITE_HW_API_BASE || 'https://two34u882345253.onrender.com';

// Zustände für die Authentifizierung
// null = Status unbekannt (muss vom Server geprüft werden)
// false = nicht angemeldet
// true = angemeldet
const isAuthenticatedStatus = ref<boolean | null>(null);

// Die alte Logik (localStorage, token.value, clearStorage, refreshExpiry) wird hier entfernt.

export function useAuth() {

    // Computed Property für den einfachen Zugriff
    const isAuthenticated = computed(() => isAuthenticatedStatus.value);

    /**
     * Ruft den geschützten /api/status Endpunkt auf, um den Cookie-Status zu prüfen.
     */
    async function checkAuthStatus(): Promise<boolean> {
        // Status muss nur einmal geprüft werden, bis eine Aktion (Login/Logout) erfolgt.
        if (isAuthenticatedStatus.value !== null) {
            return isAuthenticatedStatus.value;
        }

        try {
            // Wichtig: 'credentials: include' stellt sicher, dass der Browser das HttpOnly Cookie mitsendet!
            const res = await fetch(`${API_BASE_URL}/api/status`, {
                credentials: 'include'
            });

            // Wenn 200 OK: Cookie ist gültig
            if (res.ok) {
                isAuthenticatedStatus.value = true;
                return true;
            }
        } catch (e) {
            console.error('Fehler bei der Statusprüfung:', e);
            // Fehler = nicht angemeldet
        }

        isAuthenticatedStatus.value = false;
        return false;
    }


    /**
     * Sendet das Passwort zum Login. Der Server setzt das Cookie.
     */
    async function login(code: string) {

        try {
            const response = await fetch(`${API_BASE_URL}/api/dashboard-check`, {
                method: 'POST',
                credentials: 'include', // Wichtig: Damit der Server das Cookie setzen kann
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: code })
            });

            if (response.ok) {
                // Bei Erfolg hat der Server das HttpOnly Cookie gesetzt
                isAuthenticatedStatus.value = true;
                window.dispatchEvent(new Event('auth-changed'));
                return { ok: true };
            }

            // Fehlerbehandlung
            const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
            isAuthenticatedStatus.value = false;
            return { ok: false, error: errorData.error || 'Ungültiger Code' };

        } catch (error) {
            console.error('Login-Fehler:', error);
            isAuthenticatedStatus.value = false;
            return { ok: false, error: 'Verbindung zum Backend fehlgeschlagen.' };
        }
    }

    /**
     * Meldet den Benutzer ab, indem der Server das Cookie löscht.
     */
    function logout() {
        // Ruft den Logout-Endpunkt auf
        fetch(`${API_BASE_URL}/api/logout`, {
            method: 'POST',
            credentials: 'include'
        })
            .catch(e => console.error('Logout error:', e))
            .finally(() => {
                isAuthenticatedStatus.value = false; // Lokalen Status auf false setzen
                router.push('/welcome'); // Zur Anmeldeseite weiterleiten
                window.dispatchEvent(new Event('auth-changed'));
            });
    }

    return {
        isAuthenticated,
        login,
        logout,
        checkAuthStatus
    };
}