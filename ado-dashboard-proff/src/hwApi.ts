// src/lib/hwApi.ts
import axios from 'axios';

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: false
});

hw.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const storedToken = localStorage.getItem('hw_token');
            if (storedToken) {
                console.warn('401. Ungültiges Token. Forciere Logout.');
                setHwToken(null, null);

            }
        }
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
        window.dispatchEvent(new CustomEvent('user-logged-in'));
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
