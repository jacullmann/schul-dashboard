import axios from 'axios';

// Memory-basierter CSRF-Token-Store
let csrfTokenMemory: string | null = null;

export function setCsrfToken(token: string): void {
    csrfTokenMemory = token;
}

export function getCsrfToken(): string | null {
    return csrfTokenMemory;
}

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: true,
    timeout: 30000
});

hw.interceptors.request.use((config) => {
    const token = getCsrfToken();
    if (token) {
        config.headers['x-csrf-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

hw.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const errorData = error.response.data;
            if (errorData?.requiresAppGate) {
                window.dispatchEvent(new CustomEvent('app-gate-expired'));
            }
            if (errorData?.requiresLogin) {
                window.dispatchEvent(new CustomEvent('user-token-expired'));
            }
        }
        return Promise.reject(error);
    }
);

export default hw;