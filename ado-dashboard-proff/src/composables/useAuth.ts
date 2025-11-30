// src/composables/useAuth.ts
import { ref } from 'vue';
import hw, { setHwToken } from '../hwApi';

const token = ref<string | null>(null);
const user = ref<any>(null);
const isAuthenticated = ref(false);
const isAuthReady = ref(false);

async function verifyToken() {
    const storedToken = localStorage.getItem('hw_token');
    if (!storedToken) {
        setHwToken(null);
        return false;
    }
    setHwToken(storedToken);
    try {
        const res = await hw.get('/api/auth/me');
        user.value = res.data; // The user object contains the isAdmin property
        isAuthenticated.value = true;
        return true;
    } catch {
        setHwToken(null);
        user.value = null;
        isAuthenticated.value = false;
        return false;
    }
}

export function useAuth() {

    async function initAuth() {
        if (isAuthReady.value) return;
        await verifyToken();
        isAuthReady.value = true;
    }

    async function loginWithCode(code: string) {
        const response = await hw.post('/api/auth/login', { code });
        const { token: newToken, user: newUser } = response.data;
        setHwToken(newToken);
        user.value = newUser;
        isAuthenticated.value = true;
    }

    function logout() {
        setHwToken(null);
        user.value = null;
        isAuthenticated.value = false;
    }

    return {
        token,
        user,
        isAuthenticated,
        isAuthReady,
        loginWithCode,
        logout,
        initAuth
    };
}