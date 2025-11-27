import axios from 'axios';

const hw = axios.create({
    baseURL: import.meta.env.VITE_HW_API_BASE,
    withCredentials: true
});

// Cache for the CSRF token
let csrfToken: string | null = null;

// Function to fetch the CSRF token from the API
async function getCsrfToken() {
    // If we already have a token, return it
    if (csrfToken) return csrfToken;
    try {
        const { data } = await hw.get('/api/csrf-token');
        csrfToken = data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.error('Failed to retrieve CSRF token:', error);
        csrfToken = null; // Reset on failure
        return null;
    }
}

// Request interceptor to add CSRF token to relevant requests
hw.interceptors.request.use(async (config) => {
    const methodsToProtect = ['post', 'put', 'patch', 'delete'];
    if (config.method && methodsToProtect.includes(config.method)) {
        const token = await getCsrfToken();
        if (token) {
            config.headers['X-CSRF-Token'] = token;
        } else {
            // Block the request if the CSRF token is not available
            return Promise.reject(new Error('CSRF token is not available. Request blocked.'));
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor to handle authentication errors (e.g., expired session)
hw.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('401 Unauthorized. Session may have expired. Triggering auth-error.');
            // Dispatch a global event that the auth store can listen to, to trigger a logout
            window.dispatchEvent(new CustomEvent('auth-error'));
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

// This function is called from the auth store after a successful login
export function onLoginSuccess(userId: string) {
    umamiSetLoggedIn(true, userId);
    window.dispatchEvent(new CustomEvent('user-logged-in'));
    // Invalidate CSRF token after login to get a new one for the new session
    csrfToken = null;

    // Log page load activity
    setTimeout(() => {
        hw.post('/api/activity/pageload').catch(() => {});
    }, 1000);
}

// This function is called from the auth store on logout
export function onLogoutSuccess() {
    umamiSetLoggedIn(false);
    // Invalidate CSRF token on logout
    csrfToken = null;
}

// Initialize Umami with logged-out state by default
umamiSetLoggedIn(false);

export default hw;
