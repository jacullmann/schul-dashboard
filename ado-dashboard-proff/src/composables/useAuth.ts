import { ref, onMounted } from 'vue';
import hw, { onLoginSuccess, onLogoutSuccess } from '../hwApi';

const user = ref<any>(null);
const isAuthenticated = ref(false);
const isAuthReady = ref(false);
const isAdmin = ref(false);

async function checkAuthentication() {
    try {
        const { data } = await hw.get('/api/auth/me');
        user.value = data;
        isAuthenticated.value = true;
        isAdmin.value = !!data.isAdmin;
        onLoginSuccess(data.id);
    } catch (error) {
        user.value = null;
        isAuthenticated.value = false;
        isAdmin.value = false;
        onLogoutSuccess();
    } finally {
        isAuthReady.value = true;
    }
}

async function login(email, password) {
    try {
        await hw.post('/api/auth/login', { email, password });
        await checkAuthentication();
        return { ok: true };
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Login fehlgeschlagen';
        return { ok: false, error: errorMessage };
    }
}

async function logout() {
    try {
        await hw.post('/api/auth/logout');
    } catch (error) {
        console.error("Logout fehlgeschlagen, aber client-seitig fortfahren:", error);
    } finally {
        user.value = null;
        isAuthenticated.value = false;
        isAdmin.value = false;
        onLogoutSuccess();
    }
}

// Global listener for auth errors (e.g., from hwApi interceptor)
window.addEventListener('auth-error', () => {
    if (isAuthenticated.value) {
        console.warn('Auth-Fehler erkannt. Automatischer Logout.');
        user.value = null;
        isAuthenticated.value = false;
        isAdmin.value = false;
        onLogoutSuccess();
    }
});


export function useAuth() {

    onMounted(() => {
        if (!isAuthReady.value) {
            checkAuthentication();
        }
    });

    return {
        user,
        isAuthenticated,
        isAuthReady,
        isAdmin,
        login,
        logout,
        checkAuthentication
    };
}
