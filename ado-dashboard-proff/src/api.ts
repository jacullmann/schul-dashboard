import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    withCredentials: false
});

export function setAdminToken(token: string | null) {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('admin_token', token);
    } else {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('admin_token');
    }
}

// init from storage
const stored = localStorage.getItem('admin_token');
if (stored) setAdminToken(stored);

export default api;
