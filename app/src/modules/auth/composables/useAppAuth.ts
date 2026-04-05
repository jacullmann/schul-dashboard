import { ref } from 'vue';
import hw, { ensureCsrf } from '@/api/hwApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_ENDPOINT = '/api/groups/status';

// ─── Shared reactive state (module singleton) ─────────────────────────────────

const isAuthenticated = ref(false);
const isLoggedIn = ref(false);
const isAuthReady = ref(false);
const groupName = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const activeGroupOwnerId = ref<string | null>(null);
const userGroups = ref<
  Array<{
    id: string;
    name: string;
    role: string;
    generatedName?: string;
    ownerId?: string;
    hasUnreadContent?: boolean;
    scheduleConfig?: Record<string, any>;
  }>
>([]);

let initPromise: Promise<void> | null = null;

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

  try {
    localStorage.removeItem('active_tenant_id');
  } catch {
    // localStorage may be unavailable (e.g. certain private-browsing modes).
  }
}

function applyStatusData(data: {
  authenticated: boolean;
  group?: { id: string; name: string; ownerId?: string } | null;
  groups?: Array<{
    id: string;
    name: string;
    role: string;
    generatedName?: string;
    ownerId?: string;
    hasUnreadContent?: boolean;
    scheduleConfig?: Record<string, any>;
  }>;
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

  async function initAuth() {
    if (isAuthReady.value) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        await ensureCsrf();
        const { data } = await hw.get(STATUS_ENDPOINT);
        applyStatusData(data);
      } catch {
        clearAuthState();
      } finally {
        isAuthReady.value = true;
      }
    })();

    return initPromise;
  }

  // ─── Group actions ────────────────────────────────────────────────────────

  async function joinGroup(
    name: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const { status, data } = await hw.post('/api/groups/join', {
        groupName: name,
        password,
      });
      if ((status === 200 || status === 201) && data.ok) {
        // Server already set the new CSRF cookie via Set-Cookie header.
        await checkAuthStatus();
        return { ok: true };
      }
      return { ok: false, error: 'Failed to join group.' };
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      return {
        ok: false,
        error:
          err.response?.data?.message ??
          err.response?.data?.error ??
          'Invalid code.',
      };
    }
  }

  async function createGroup(
    name: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const { status, data } = await hw.post('/api/groups/create', {
        groupName: name,
        password,
      });
      if ((status === 200 || status === 201) && data.ok) {
        await checkAuthStatus();
        return { ok: true };
      }
      return { ok: false, error: 'Group creation failed.' };
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      return {
        ok: false,
        error:
          err.response?.data?.message ??
          err.response?.data?.error ??
          'An error occurred.',
      };
    }
  }

  async function switchActiveGroup(groupId: string): Promise<AuthResult> {
    // Debounce: if a switch to the SAME group is already in flight, reuse it.
    if (switchPromise && switchTarget === groupId) {
      return switchPromise;
    }

    // Snapshot full state for a complete rollback on failure.
    const snapshot = {
      activeGroupId: activeGroupId.value,
      groupName: groupName.value,
      userGroups: userGroups.value,
      isLoggedIn: isLoggedIn.value,
      isAuthenticated: isAuthenticated.value,
    };

    switchTarget = groupId;
    switchPromise = (async (): Promise<AuthResult> => {
      try {
        const { status, data } = await hw.post('/api/groups/switch', {
          groupId,
        });

        if ((status === 200 || status === 201) && data.ok) {
          // Canonical server sync — refreshes groupName, userGroups, etc.
          await checkAuthStatus();
          window.dispatchEvent(
            new CustomEvent('tenant-changed', { detail: { groupId } }),
          );
          return { ok: true };
        }

        throw new Error(data?.error ?? 'Group switch failed.');
      } catch (error: unknown) {
        // Full rollback: restore every piece of state.
        activeGroupId.value = snapshot.activeGroupId;
        groupName.value = snapshot.groupName;
        userGroups.value = snapshot.userGroups;
        isLoggedIn.value = snapshot.isLoggedIn;
        isAuthenticated.value = snapshot.isAuthenticated;

        const err = error as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        const message =
          err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          'Group switch failed.';
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

  const activeScheduleConfig = computed(() => {
    if (!activeGroupId.value) return null;
    const activeGroup = userGroups.value.find(
      (g) => g.id === activeGroupId.value,
    );
    return activeGroup?.scheduleConfig ?? null;
  });

  return {
    isAuthenticated,
    isLoggedIn,
    isAuthReady,
    groupName,
    activeGroupId,
    activeGroupOwnerId,
    activeScheduleConfig,
    userGroups,
    initAuth,
    checkAuthStatus,
    joinGroup,
    createGroup,
    switchActiveGroup,
    logout,
  };
}
