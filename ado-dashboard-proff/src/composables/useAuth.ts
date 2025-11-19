// src/composables/useAuth.ts
// DIES IST EINE MOCK-IMPLEMENTIERUNG FÜR DIE LOKALE ENTWICKLUNG.
// SIE MUSS DURCH DIE ECHTE VERSION ERSETZT WERDEN, BEVOR DIE ANWENDUNG
// IN EINER PRODUKTIONSUMGEBUNG EINGESETZT WIRD!
import { ref } from 'vue';

// Konstanten, die in dieser Mock-Version nicht verwendet werden, aber beibehalten werden,
// um die Schnittstelle konsistent zu halten (optional)
// const BACKEND_BASE_URL = '...';
// const API_ENDPOINT = '...';
const STORAGE_KEY = 'm38ct09qw3motw3uiholwiu5h4lvzwilizukrejhklgwh';
const STORAGE_EXPIRES_KEY = 'nvzutsjikvthk543htom8s54hvoztw4vzw';


// Globale Zustände, die wir exponieren
// Setzen Sie den Token auf einen Dummy-Wert
const token = ref<string | null>('FAKE_LOCAL_TOKEN');

// Wichtig: Immer auf true setzen für den lokalen Dev-Mode
const isAuthenticated = ref(true);

// Ready-Status sofort auf true setzen, da keine asynchrone Prüfung nötig ist
const isAuthReady = ref(true);


function now() { return Date.now(); }
function inThirtyDaysMs() { return 30 * 24 * 60 * 60 * 1000; }

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRES_KEY);
}


export function useAuth() {

    // Simuliert die asynchrone Initialisierung, schließt sie aber sofort ab.
    // Der Router Guard wartet hier nur kurz (await), aber der Status ist sofort bereit.
    async function initAuth() {
        if (isAuthReady.value) return;

        // In der echten App würde hier loadFromStorage und syncAuthState() stehen
        // Hier setzen wir den Zustand einfach direkt.
        token.value = 'FAKE_LOCAL_TOKEN';
        isAuthenticated.value = true;
        isAuthReady.value = true;
    }

    // Simuliert einen erfolgreichen Login, speichert aber nichts Persistentes (optional)
    async function loginWithCode(code: string) {
        token.value = 'FAKE_LOCAL_TOKEN';
        isAuthenticated.value = true;
        isAuthReady.value = true;

        // Keine echten Speicheroperationen oder API-Aufrufe
        console.log('MOCK AUTH: Login erfolgreich simuliert.');
        return { ok: true };
    }

    // Simuliert einen Logout
    function logout() {
        token.value = null;
        isAuthenticated.value = false;
        clearStorage();
        console.log('MOCK AUTH: Logout simuliert.');
    }

    // Leere Funktion, da keine echte Ablaufzeit vorhanden ist
    function refreshExpiry() {
        // Ignoriert im Mock-Modus
    }

    // Leere Funktion
    function loadFromStorage() {
        // Ignoriert im Mock-Modus
    }

    // Deaktivieren des automatischen Refresh-Intervalls
    // Deaktivieren des Event-Listeners
    // Die initAuth wird jetzt vom Router Guard aufgerufen, was reicht.

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