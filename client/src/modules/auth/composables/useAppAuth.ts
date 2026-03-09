// src/modules/auth/composables/useAppAuth.ts
import { ref } from 'vue';
import axios from 'axios';
import hw, { setCsrfToken } from '@/api/hwApi';

const STATUS_ENDPOINT = '/api/groups/status';
const GROUPS_ENDPOINT = '/api/auth/groups';

const isAuthenticated = ref(false);
const isLoggedIn = ref(false);
const isAuthReady = ref(false);
const groupName = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const userGroups = ref<Array<{ id: string; name: string; role: string; generatedName?: string }>>([]);
let initPromise: Promise<void> | null = null;
let eventListenerRegistered = false;
const MAX_CSRF_RETRIES = 3;
const CSRF_RETRY_DELAY = 1000;

export function useAppAuth() {
    async function fetchGroups() {
        try {
            const { data } = await hw.get(GROUPS_ENDPOINT);
            userGroups.value = data.groups ?? [];
        } catch {
            userGroups.value = [];
        }
    }

    async function checkAuthStatus() {
        try {
            const { data } = await hw.get(STATUS_ENDPOINT);
            isLoggedIn.value = data.authenticated === true;
            isAuthenticated.value = data.authenticated === true;
            groupName.value = data.group?.name ?? null;
            activeGroupId.value = data.group?.id ?? null;
            userGroups.value = data.groups ?? [];

            if (activeGroupId.value) {
                localStorage.setItem('active_tenant_id', activeGroupId.value);
            } else {
                localStorage.removeItem('active_tenant_id');
            }

            return data.authenticated;
        } catch {
            isLoggedIn.value = false;
            isAuthenticated.value = false;
            groupName.value = null;
            activeGroupId.value = null;
            userGroups.value = [];
            localStorage.removeItem('active_tenant_id');
            return false;
        }
    }

    async function initAuth() {
        if (isAuthReady.value) return;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            let csrfInitialized = false;
            const baseUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_HW_API_BASE : '';
            for (let attempt = 1; attempt <= MAX_CSRF_RETRIES; attempt++) {
                try {
                    const { data } = await axios.get(
                        `${baseUrl || ''}/api/csrf/init`,
                        { withCredentials: true },
                    );
                    if (data.csrfToken) {
                        setCsrfToken(data.csrfToken);
                        csrfInitialized = true;
                        break;
                    }
                } catch {
                    if (attempt < MAX_CSRF_RETRIES) {
                        await new Promise(r => setTimeout(r, CSRF_RETRY_DELAY));
                    }
                }
            }
            if (!csrfInitialized) {
                window.dispatchEvent(new CustomEvent('csrf-init-failed'));
                isAuthReady.value = true;
                isLoggedIn.value = false;
                isAuthenticated.value = false;
                return;
            }
            await checkAuthStatus();
            isAuthReady.value = true;

            if (!eventListenerRegistered) {
                window.addEventListener('auth-expired', () => {
                    isLoggedIn.value = false;
                    isAuthenticated.value = false;
                });
                eventListenerRegistered = true;
            }
        })();

        await initPromise;
    }

    async function joinGroup(name: string, password: string) {
        try {
            const response = await hw.post('/api/groups/join', { groupName: name, password });
            if (response.status === 200 && response.data.ok) {
                isAuthenticated.value = true;
                isAuthReady.value = true;
                await checkAuthStatus();
                return { ok: true, csrfToken: response.data.csrfToken || null };
            }
            return { ok: false, error: 'Login fehlgeschlagen' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            return { ok: false, error: err.response?.data?.error || 'Ungültiger Code' };
        }
    }

    async function createGroup(name: string, password: string) {
        try {
            const response = await hw.post('/api/groups/create', { groupName: name, password });
            if (response.status === 200 && response.data.ok) {
                isAuthenticated.value = true;
                isAuthReady.value = true;
                await checkAuthStatus();
                return { ok: true, csrfToken: response.data.csrfToken || null };
            }
            return { ok: false, error: 'Gruppenerstellung fehlgeschlagen' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            return { ok: false, error: err.response?.data?.error || 'Fehler' };
        }
    }

    async function logout() {
        try {
            await hw.post('/api/groups/logout');
        } catch { } finally {
            isLoggedIn.value = false;
            isAuthenticated.value = false;
            isAuthReady.value = false;
            groupName.value = null;
            activeGroupId.value = null;
            userGroups.value = [];
            localStorage.removeItem('active_tenant_id');
            initPromise = null;
        }
    }

    async function switchActiveGroup(groupId: string) {
        try {
            const response = await hw.post('/api/groups/switch', { groupId });
            if (response.status === 200 && response.data.ok) {
                setCsrfToken(response.data.csrfToken);
                await checkAuthStatus();
                window.dispatchEvent(new CustomEvent('tenant-changed', { detail: { groupId } }));
                return { ok: true };
            }
            return { ok: false, error: 'Wechsel fehlgeschlagen' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            return { ok: false, error: err.response?.data?.error || 'Wechsel fehlgeschlagen' };
        }
    }

    return {
        isAuthenticated,
        isLoggedIn,
        isAuthReady,
        groupName,
        activeGroupId,
        userGroups,
        joinGroup,
        createGroup,
        switchActiveGroup,
        logout,
        initAuth,
        checkAuthStatus,
        fetchGroups,
    };
}