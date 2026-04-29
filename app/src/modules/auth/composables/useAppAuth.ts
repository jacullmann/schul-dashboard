import { ref, computed } from 'vue';
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
type UserGroup = {
  id: string;
  name: string;
  role: string;
  generatedName?: string;
  ownerId?: string;
  hasUnreadContent?: boolean;
  scheduleConfig?: Record<string, any>;
};

const userGroups = ref<UserGroup[]>([]);

let initPromise: Promise<void> | null = null;
let statusPromise: Promise<boolean> | null = null;
let switchPromise: Promise<AuthResult> | null = null;
let switchTarget: string | null = null;

// ─── Result types ─────────────────────────────────────────────────────────────
type OkResult = { ok: true };
type ErrResult = { ok: false; error: string };
type AuthResult = OkResult | ErrResult;

type GroupSnapshot = {
  activeGroupId: string | null;
  groupName: string | null;
  userGroups: typeof userGroups.value;
  isLoggedIn: boolean;
  isAuthenticated: boolean;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────
function clearAuthState(): void {
  isLoggedIn.value = false;
  isAuthenticated.value = false;
  groupName.value = null;
  activeGroupId.value = null;
  activeGroupOwnerId.value = null;
  userGroups.value = [];
  statusPromise = null;
  try {
    localStorage.removeItem('active_tenant_id');
  } catch {
    // localStorage may be unavailable (e.g. certain private-browsing modes).
  }
}

function applyStatusData(data: {
  authenticated: boolean;
  group?: { id: string; name: string; ownerId?: string } | null;
  groups?: UserGroup[];
}): void {
  isLoggedIn.value = data.authenticated;
  isAuthenticated.value = data.authenticated;
  groupName.value = data.group?.name ?? null;
  activeGroupId.value = data.group?.id ?? null;
  activeGroupOwnerId.value = data.group?.ownerId ?? null;
  userGroups.value = data.groups ?? [];
}

async function doInitAuth(): Promise<void> {
  try {
    await ensureCsrf();
    const { data } = await hw.get(STATUS_ENDPOINT);
    applyStatusData(data);
  } catch {
    clearAuthState();
  } finally {
    isAuthReady.value = true;
    initPromise = null;
  }
}

async function doSwitchGroup(
  groupId: string,
  snapshot: GroupSnapshot,
  checkAuthStatus: () => Promise<boolean>,
): Promise<AuthResult> {
  try {
    const { status, data } = await hw.post('/api/groups/switch', { groupId });

    if ((status === 200 || status === 201) && data.ok) {
      await checkAuthStatus();
      window.dispatchEvent(
        new CustomEvent('tenant-changed', { detail: { groupId } }),
      );
      return { ok: true };
    }

    throw new Error(data?.error ?? 'Group switch failed.');
  } catch (error: unknown) {
    activeGroupId.value = snapshot.activeGroupId;
    groupName.value = snapshot.groupName;
    userGroups.value = snapshot.userGroups;
    isLoggedIn.value = snapshot.isLoggedIn;
    isAuthenticated.value = snapshot.isAuthenticated;

    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      ok: false,
      error:
        err.response?.data?.message ??
        err.response?.data?.error ??
        err.message ??
        'Group switch failed.',
    };
  } finally {
    switchPromise = null;
    switchTarget = null;
  }
}

// ─── Composable ───────────────────────────────────────────────────────────────
export function useAppAuth() {
  async function checkAuthStatus(): Promise<boolean> {
    if (statusPromise) return statusPromise;

    statusPromise = (async () => {
      try {
        const { data } = await hw.get(STATUS_ENDPOINT);
        applyStatusData(data);
        return data.authenticated === true;
      } catch {
        clearAuthState();
        return false;
      } finally {
        statusPromise = null;
      }
    })();

    return statusPromise;
  }

  async function initAuth(): Promise<void> {
    if (isAuthReady.value) return;
    if (initPromise) return initPromise;
    initPromise = doInitAuth();
    return initPromise;
  }

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
    if (switchPromise && switchTarget === groupId) {
      return switchPromise;
    }

    const snapshot: GroupSnapshot = {
      activeGroupId: activeGroupId.value,
      groupName: groupName.value,
      userGroups: userGroups.value,
      isLoggedIn: isLoggedIn.value,
      isAuthenticated: isAuthenticated.value,
    };

    switchTarget = groupId;
    switchPromise = doSwitchGroup(groupId, snapshot, checkAuthStatus);
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
