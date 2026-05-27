import { ref, computed } from 'vue';
import hw, { ensureCsrf, refreshSession } from '@/api/api.ts';
import { useUserStore } from '@/stores/userStore';

const STATUS_ENDPOINT = '/groups/status';

const isAuthenticated = ref(false);
const isLoggedIn = ref(false);
const isAuthReady = ref(false);
const groupName = ref<string | null>(null);
const activeGroupId = ref<string | null>(null);
const activeGroupOwnerId = ref<string | null>(null);
const activeGroupAvatarUrl = ref<string | null>(null);
const activeGroupPermissions = ref<Record<string, string>>({});

type UserGroup = {
  id: string;
  name: string;
  role: string;
  generatedName?: string;
  ownerId?: string;
  hasUnreadContent?: boolean;
  scheduleConfig?: Record<string, any>;
  avatarUrl?: string;
};

const userGroups = ref<UserGroup[]>([]);

let initPromise: Promise<void> | null = null;
let statusPromise: Promise<boolean> | null = null;
let switchPromise: Promise<AuthResult> | null = null;
let switchTarget: string | null = null;
let authExpiredHandlerInstalled = false;

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

function clearAuthState(): void {
  isLoggedIn.value = false;
  isAuthenticated.value = false;
  groupName.value = null;
  activeGroupId.value = null;
  activeGroupOwnerId.value = null;
  activeGroupAvatarUrl.value = null;
  activeGroupPermissions.value = {};
  userGroups.value = [];
  statusPromise = null;
  try {
    localStorage.removeItem('active_tenant_id');
  } catch {}
}

function applyStatusData(data: {
  authenticated: boolean;
  group?: {
    id: string;
    name: string;
    ownerId?: string;
    avatarUrl?: string;
    permissions?: Record<string, string>;
  } | null;
  groups?: UserGroup[];
}): void {
  isLoggedIn.value = data.authenticated;
  isAuthenticated.value = data.authenticated;
  groupName.value = data.group?.name ?? null;
  activeGroupId.value = data.group?.id ?? null;
  activeGroupOwnerId.value = data.group?.ownerId ?? null;
  activeGroupAvatarUrl.value = data.group?.avatarUrl ?? null;
  activeGroupPermissions.value = data.group?.permissions ?? {};
  userGroups.value = data.groups ?? [];
}

function installAuthExpiredHandlerOnce(): void {
  if (authExpiredHandlerInstalled) return;
  authExpiredHandlerInstalled = true;
  window.addEventListener('auth-expired', () => {
    clearAuthState();
    isAuthReady.value = true;
    initPromise = null;
  });
}

async function doInitAuth(): Promise<void> {
  try {
    await ensureCsrf();
    try {
      await refreshSession({ silent: true });
    } catch {}
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
    const { status, data } = await hw.post('/groups/switch', { groupId });

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

export function useAppAuth() {
  installAuthExpiredHandlerOnce();

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
      const { status, data } = await hw.post('/groups/join', {
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
      const { status, data } = await hw.post('/groups/create', {
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
      await hw.post('/auth/logout');
    } catch {
    } finally {
      clearAuthState();
      isAuthReady.value = false;
      initPromise = null;
    }
  }

  async function logoutAllDevices(): Promise<void> {
    try {
      await hw.post('/auth/logout-all');
    } catch {
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

  function checkPermission(permissionKey: string): boolean {
    const userStore = useUserStore();
    if (userStore.user?.role === 'superadmin') return true;

    const activeGroup = userGroups.value.find(
      (g) => g.id === activeGroupId.value,
    );
    if (!activeGroup) return false;

    if (activeGroupOwnerId.value === userStore.user?.id) return true;

    const userRole = activeGroup.role;
    if (userRole === 'admin') return true;

    const defaultPermissions: Record<string, string> = {
      edit_group_general: 'moderator',
      edit_subjects_courses: 'admin',
      edit_schedule: 'admin',
      create_items: 'user',
      upload_images: 'user',
      manage_notes: 'moderator',
      send_messages: 'user',
      manage_schedule_changes: 'moderator',
      manage_announcements: 'moderator',
      moderate_members: 'moderator',
      delete_other_content: 'moderator',
    };

    const requiredRole =
      activeGroupPermissions.value[permissionKey] ||
      defaultPermissions[permissionKey] ||
      'admin';

    if (requiredRole === 'user') return true;
    if (requiredRole === 'moderator') return userRole === 'moderator';
    if (requiredRole === 'admin') return false;
    return false;
  }

  return {
    isAuthenticated,
    isLoggedIn,
    isAuthReady,
    groupName,
    activeGroupId,
    activeGroupOwnerId,
    activeGroupAvatarUrl,
    activeGroupPermissions,
    activeScheduleConfig,
    userGroups,
    initAuth,
    checkAuthStatus,
    joinGroup,
    createGroup,
    switchActiveGroup,
    logout,
    logoutAllDevices,
    checkPermission,
  };
}
