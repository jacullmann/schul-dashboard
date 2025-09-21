import axios from 'axios';

export const loadingCounter = { value: 0 }; // reactive-ish simple counter

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: false,
});

// Interceptors: global loading + robust errors
hw.interceptors.request.use((config) => {
    loadingCounter.value++;
    return config;
});

hw.interceptors.response.use(
    (res) => {
        loadingCounter.value = Math.max(0, loadingCounter.value - 1);
        return res;
    },
    (error) => {
        loadingCounter.value = Math.max(0, loadingCounter.value - 1);
        // Normalize error shape
        const e = error?.response?.data || { ok: false, error: 'Netzwerkfehler' };
        return Promise.reject(e);
    }
);

export function setHwToken(token: string | null) {
    if (token) {
        hw.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('hw_token', token);
    } else {
        delete hw.defaults.headers.common['Authorization'];
        localStorage.removeItem('hw_token');
    }
}

const stored = localStorage.getItem('hw_token');
if (stored) setHwToken(stored);

export default hw;
