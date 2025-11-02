// src/lib/hwApi.ts
import axios from 'axios';

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: false
});

hw.interceptors.response.use(
    (response) => response, // Erfolgreiche Antworten einfach durchlassen
    (error) => {
        // Prüfen, ob der Fehler eine 401-Antwort vom Server ist
        if (error.response && error.response.status === 401) {
            // Prüfen, ob überhaupt ein Token im localStorage war.
            // Wir wollen niemanden ausloggen, der nur die Login-Seite besucht.
            const storedToken = localStorage.getItem('hw_token');
            if (storedToken) {
                console.warn('API returned 401. Token ungültig oder User gesperrt. Forcing logout.');
                // Nutze deine existierende setHwToken Funktion, um alles aufzuräumen
                setHwToken(null, null);

            }
        }
        // Wichtig: Den Fehler weitergeben, damit .catch() Blöcke ihn fangen können
        return Promise.reject(error);
    }
);

function umamiSetLoggedIn(status: boolean, userId?: string | null) {
    try {
        const u = (window as any).umami;
        if (!u) return;
        if (userId) u.identify(userId, { logged_in: status });
        else u.identify({ logged_in: status });
    } catch {}
}

export function setHwToken(token: string | null, userId?: string | null) {
    if (token) {
        hw.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('hw_token', token);
        if (userId) localStorage.setItem('hw_user_id', userId);
        umamiSetLoggedIn(true, userId ?? localStorage.getItem('hw_user_id'));
    } else {
        delete hw.defaults.headers.common['Authorization'];
        localStorage.removeItem('hw_token');
        localStorage.removeItem('hw_user_id');
        umamiSetLoggedIn(false);
    }
}


const stored = localStorage.getItem('hw_token');
const storedUserId = localStorage.getItem('hw_user_id');
if (stored) {
    hw.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
    umamiSetLoggedIn(true, storedUserId);
} else {
    umamiSetLoggedIn(false);
}

export default hw;
