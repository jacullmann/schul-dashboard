import axios from 'axios';

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: false
});

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
