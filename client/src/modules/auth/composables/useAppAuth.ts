import { ref } from 'vue';
import axios from 'axios';
import hw, { setCsrfToken } from '@/api/hwApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_ENDPOINT = '/api/groups/status';
const MAX_CSRF_RETRIES = 3;
const CSRF_RETRY_DELAY_MS = 1_000;

// ─── Shared reactive state (module singleton) ─────────────────────────────────

const isAuthenticated = ref(false);
const isLoggedIn = ref(false);
const isAuthReady = ref(false);
const groupName = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const activeGroupOwnerId = ref<string | null>(null);
const userGroups = ref<
    Array<{ id: string; name: string; role: string; generatedName?: string; ownerId?: string; hasUnreadContent?: boolean }>
>([]);

let initPromise: Promise<void> | null = null;
let authExpiredListenerRegistered = false;

// ─── Active group-switch guard ────────────────────────────────────────────────
// Prevents parallel switch calls (e.g. rapid navigation between group routes).
let switchPromise: Promise<AuthResult> | null = null;
let switchTarget: string | null = null;

// ─── Result types ─────────────────────────────────────────────────────────────

type OkResult = { ok: true };
type ErrResult = { ok: false; error: string };
type AuthResult = OkResult | ErrResult;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clearAuthState(): void {
    isLoggedIn.value = false;
    isAuthenticated.value = false;
    groupName.value = null;
    activeGroupId.value = null;
    activeGroupOwnerId.value = null;
    userGroups.value = [];

    // Clean up legacy localStorage key from previous code versions.
    try {
        localStorage.removeItem('active_tenant_id');
    } catch {
        // localStorage may be unavailable (e.g. incognito in some browsers).
    }
}

function applyStatusData(data: {
    authenticated: boolean;
    group?: { id: string; name: string; ownerId?: string } | null;
    groups?: Array<{ id: string; name: string; role: string; generatedName?: string; ownerId?: string; hasUnreadContent?: boolean }>;
}): void {
    isLoggedIn.value = data.authenticated;
    isAuthenticated.value = data.authenticated;
    groupName.value = data.group?.name ?? null;
    activeGroupId.value = data.group?.id ?? null;
    activeGroupOwnerId.value = data.group?.ownerId ?? null;
    userGroups.value = data.groups ?? [];
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useAppAuth() {
    async function checkAuthStatus(): Promise<boolean> {
        try {
            const { data } = await hw.get(STATUS_ENDPOINT);
            applyStatusData(data);
            return data.authenticated === true;
        } catch {
            clearAuthState();
            return false;
        }
    }

    async function initAuth(): Promise<void> {
        if (isAuthReady.value) return;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            const baseUrl =
                typeof import.meta !== 'undefined' && import.meta.env
                    ? import.meta.env.VITE_HW_API_BASE
                    : '';

            let csrfInitialized = false;
            for (let attempt = 1; attempt <= MAX_CSRF_RETRIES; attempt++) {
                try {
                    const { data } = await axios.get(
                        `${baseUrl || ''}/api/system/csrf/init`,
                        { withCredentials: true },
                    );
                    if (data.csrfToken) {
                        setCsrfToken(data.csrfToken);
                        csrfInitialized = true;
                        break;
                    }
                } catch {
                    if (attempt < MAX_CSRF_RETRIES) {
                        await new Promise((r) => setTimeout(r, CSRF_RETRY_DELAY_MS));
                    }
                }
            }

            if (!csrfInitialized) {
                window.dispatchEvent(new CustomEvent('csrf-init-failed'));
                clearAuthState();
                isAuthReady.value = true;
                return;
            }

            await checkAuthStatus();
            isAuthReady.value = true;

            if (!authExpiredListenerRegistered) {
                window.addEventListener('auth-expired', clearAuthState);
                authExpiredListenerRegistered = true;
            }
        })();

        return initPromise;
    }

    // ─── Group actions ────────────────────────────────────────────────────────

    async function joinGroup(name: string, password: string): Promise<AuthResult> {
        try {
            const { status, data } = await hw.post('/api/groups/join', {
                groupName: name,
                password,
            });
            if ((status === 200 || status === 201) && data.ok) {
                if (data.csrfToken) setCsrfToken(data.csrfToken);
                // Full server sync — the JWT now encodes the new active tenant.
                await checkAuthStatus();
                return { ok: true };
            }
            return { ok: false, error: 'Login fehlgeschlagen' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            return { ok: false, error: err.response?.data?.error ?? 'Ungültiger Code' };
        }
    }

    async function createGroup(name: string, password: string): Promise<AuthResult> {
        try {
            const { status, data } = await hw.post('/api/groups/create', {
                groupName: name,
                password,
            });
            if ((status === 200 || status === 201) && data.ok) {
                if (data.csrfToken) setCsrfToken(data.csrfToken);
                await checkAuthStatus();
                return { ok: true };
            }
            return { ok: false, error: 'Gruppenerstellung fehlgeschlagen' };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            return { ok: false, error: err.response?.data?.error ?? 'Fehler' };
        }
    }

    async function switchActiveGroup(groupId: string): Promise<AuthResult> {
        // Debounce: if a switch to the SAME group is already in flight, reuse it.
        if (switchPromise && switchTarget === groupId) {
            return switchPromise;
        }

        // Snapshot full state for complete rollback on failure.
        const snapshot = {
            activeGroupId: activeGroupId.value,
            groupName: groupName.value,
            userGroups: userGroups.value,
            isLoggedIn: isLoggedIn.value,
            isAuthenticated: isAuthenticated.value,
        };

        // We NO LONGER optimistically update `activeGroupId` before the network request.
        // Doing so caused UI components to remount and send data fetching requests (e.g., loads Tasks or Timetable)
        // against the backend BEFORE the backend actually processed the tenant switch.

        switchTarget = groupId;
        switchPromise = (async (): Promise<AuthResult> => {
            try {
                const { status, data } = await hw.post('/api/groups/switch', { groupId });

                if ((status === 200 || status === 201) && data.ok) {
                    if (data.csrfToken) setCsrfToken(data.csrfToken);
                    // Canonical server sync — updates groupName, userGroups, etc.
                    await checkAuthStatus();
                    window.dispatchEvent(
                        new CustomEvent('tenant-changed', { detail: { groupId } }),
                    );
                    return { ok: true };
                }

                throw new Error(data?.error ?? 'Wechsel fehlgeschlagen');
            } catch (error: unknown) {
                // Full rollback: restore every piece of state we might have mutated.
                activeGroupId.value = snapshot.activeGroupId;
                groupName.value = snapshot.groupName;
                userGroups.value = snapshot.userGroups;
                isLoggedIn.value = snapshot.isLoggedIn;
                isAuthenticated.value = snapshot.isAuthenticated;

                const err = error as { response?: { data?: { error?: string } }; message?: string };
                const message =
                    err.response?.data?.error ?? err.message ?? 'Wechsel fehlgeschlagen';
                return { ok: false, error: message };
            } finally {
                switchPromise = null;
                switchTarget = null;
            }
        })();

        return switchPromise;
    }

    async function logout(): Promise<void> {
        try {
            await hw.post('/api/groups/logout');
        } catch {
            // Always clear local state even if the server call fails.
        } finally {
            clearAuthState();
            isAuthReady.value = false;
            initPromise = null;
        }
    }

    return {
        isAuthenticated,
        isLoggedIn,
        isAuthReady,
        groupName,
        activeGroupId,
        activeGroupOwnerId,
        userGroups,
        initAuth,
        checkAuthStatus,
        joinGroup,
        createGroup,
        switchActiveGroup,
        logout,
    };
}