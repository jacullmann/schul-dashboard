import axios from 'axios';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const pattern = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = document.cookie.match(
        new RegExp('(?:^|; )' + pattern + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
}

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: true
});

hw.interceptors.request.use((config) => {
    const csrfToken = getCookie('csrf_token');

    if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});


hw.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const errorData = error.response.data;
            if (errorData?.requiresAppGate) {
                console.warn('App-Gate Cookie abgelaufen');
                window.dispatchEvent(new CustomEvent('app-gate-expired'));
            }
            if (errorData?.requiresLogin) {
                console.warn('User-Token abgelaufen');
                window.dispatchEvent(new CustomEvent('user-token-expired'));
            }
        }
        return Promise.reject(error);
    }
);

function logPageLoad() {
    hw.post('/api/activity/pageload').catch(() => {});
}

logPageLoad();

export default hw;