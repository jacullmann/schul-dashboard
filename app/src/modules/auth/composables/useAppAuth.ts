import { ref, computed } from 'vue';
import type { RouteLocationNamedRaw } from 'vue-router';
import hw, { ensureCsrf, refreshSession } from '@/api/api.ts';
import { groupPath } from '@/api/groupPath';
import i18n from '@/i18n';
import type { ScheduleConfig } from '@/modules/schedule/types';
import {
  toCourseSetup,
  toGroupType,
  type CourseSetup,
  type GroupType,
} from '@/types/groups';
import type { PermissionKey, PermissionMatrix } from '@/types/permissions.ts';

const STATUS_ENDPOINT = '/groups/status';

export type UserGroup = {
  id: string;
  name: string;
  role: string;
  ownerId: string;
  scheduleConfig?: ScheduleConfig;
  avatarUrl?: string | null;
  permissions: PermissionMatrix;
  groupType: GroupType;
  daltonEnabled: boolean;
  effectivePermissions: PermissionKey[];
  courseSetup: CourseSetup;
};

type RawGroup = Omit<
  UserGroup,
  'groupType' | 'effectivePermissions' | 'courseSetup'
> & {
  groupType?: string;
  effectivePermissions?: string[];
  courseSetup?: string;
};

type StatusResponse = {
  authenticated: boolean;
  groups?: RawGroup[];
  landingGroupId?: string | null;
};

const isAuthenticated = ref(false);
const isLoggedIn = ref(false);
const isAuthReady = ref(false);

const userGroups = ref<UserGroup[]>([]);
const landingGroupId = ref<string | null>(null);

/**
 * The group the current route shows. It is per tab and derived from the URL
 * by the router, so two tabs on different groups never interfere.
 */
const activeGroupId = ref<string | null>(null);

/** The last group this tab showed, kept while visiting non-group pages. */
const recentGroupId = ref<string | null>(null);

/** A group a superadmin opened without being a member of it. */
const foreignGroup = ref<UserGroup | null>(null);

let initPromise: Promise<void> | null = null;
let statusPromise: Promise<boolean> | null = null;
let authExpiredHandlerInstalled = false;

type ErrResult = { ok: false; error: string };

const PERMISSION_KEYS: readonly string[] = [
  'edit_group_general',
  'edit_subjects_courses',
  'edit_schedule',
  'create_items',
  'upload_images',
  'manage_notes',
  'send_messages',
  'manage_schedule_changes',
  'manage_announcements',
  'moderate_members',
  'edit_other_content',
  'delete_other_content',
  'invite_members',
] satisfies PermissionKey[];

function isPermissionKey(s: string): s is PermissionKey {
  return PERMISSION_KEYS.includes(s);
}

function toUserGroup(raw: RawGroup): UserGroup {
  return {
    ...raw,
    groupType: toGroupType(raw.groupType),
    daltonEnabled: raw.daltonEnabled === true,
    effectivePermissions: (raw.effectivePermissions ?? []).filter(
      isPermissionKey,
    ),
    courseSetup: toCourseSetup(raw.courseSetup),
  };
}

function findGroup(groupId: string | null): UserGroup | null {
  if (!groupId) return null;
  return (
    userGroups.value.find((g) => g.id === groupId) ??
    (foreignGroup.value?.id === groupId ? foreignGroup.value : null)
  );
}

const activeGroup = computed(() => findGroup(activeGroupId.value));

/**
 * The group an action started outside a group page defaults to: the one on
 * screen, else the one this tab showed last, else where the user landed.
 */
const contextGroupId = computed<string | null>(() => {
  const candidates = [
    activeGroupId.value,
    recentGroupId.value,
    landingGroupId.value,
  ];
  return (
    candidates.find((id) => findGroup(id) !== null) ??
    userGroups.value[0]?.id ??
    null
  );
});

/** Where to go when nothing more specific applies, e.g. after sign-in. */
const homeRoute = computed<RouteLocationNamedRaw>(() =>
  contextGroupId.value
    ? { name: 'group-dashboard', params: { groupId: contextGroupId.value } }
    : { name: 'groups' },
);

const groupName = computed(() => activeGroup.value?.name ?? null);
const activeGroupOwnerId = computed(() => activeGroup.value?.ownerId ?? null);
const activeGroupAvatarUrl = computed(
  () => activeGroup.value?.avatarUrl ?? null,
);
const activeGroupPermissions = computed(
  () => activeGroup.value?.permissions ?? null,
);
const activeGroupType = computed<GroupType>(
  () => activeGroup.value?.groupType ?? 'regular',
);
const activeGroupDaltonEnabled = computed(
  () => activeGroup.value?.daltonEnabled === true,
);
const activeScheduleConfig = computed(
  () => activeGroup.value?.scheduleConfig ?? null,
);
const activePermissions = computed(
  () => new Set<PermissionKey>(activeGroup.value?.effectivePermissions ?? []),
);

function clearAuthState(): void {
  isLoggedIn.value = false;
  isAuthenticated.value = false;
  userGroups.value = [];
  landingGroupId.value = null;
  activeGroupId.value = null;
  recentGroupId.value = null;
  foreignGroup.value = null;
  statusPromise = null;
}

function applyStatusData(data: StatusResponse): void {
  isLoggedIn.value = data.authenticated;
  isAuthenticated.value = data.authenticated;
  userGroups.value = (data.groups ?? []).map(toUserGroup);
  landingGroupId.value = data.landingGroupId ?? null;
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

async function fetchStatus(): Promise<boolean> {
  const { data } = await hw.get<StatusResponse>(STATUS_ENDPOINT);
  applyStatusData(data);
  return data.authenticated === true;
}

async function restoreSession(): Promise<void> {
  try {
    await refreshSession({ silent: true });
  } catch {
    return;
  }
  await fetchStatus();
}

// The app must not render until the session is resolved: an expired access
// token with a valid refresh cookie is still a logged-in user, and anything
// mounted in between would act on a false "logged out" state.
async function doInitAuth(): Promise<void> {
  try {
    await ensureCsrf();
    if (!(await fetchStatus())) await restoreSession();
  } catch {
    clearAuthState();
  } finally {
    isAuthReady.value = true;
    initPromise = null;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
  };
  return err.response?.data?.message ?? err.response?.data?.error ?? fallback;
}

export function useAppAuth() {
  installAuthExpiredHandlerOnce();

  async function checkAuthStatus(): Promise<boolean> {
    if (statusPromise) return statusPromise;

    statusPromise = (async () => {
      try {
        return await fetchStatus();
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

  /**
   * Whether this tab may show `groupId`. Membership is the server's call: a
   * group missing from the list is only reachable for a superadmin, and the
   * server answers 404 to anyone else.
   */
  async function canShowGroup(groupId: string): Promise<boolean> {
    if (findGroup(groupId)) return true;
    try {
      const { data } = await hw.get<RawGroup>(groupPath(groupId));
      foreignGroup.value = toUserGroup(data);
      return true;
    } catch {
      return false;
    }
  }

  /** Mirrors a course setup the server just saved or reset. */
  function setCourseSetup(groupId: string, courseSetup: CourseSetup): void {
    const group = findGroup(groupId);
    if (group) group.courseSetup = courseSetup;
  }

  /** Called once a navigation is confirmed, with the group its URL names. */
  function showGroup(groupId: string | null): void {
    if (groupId === activeGroupId.value) return;
    activeGroupId.value = groupId;
    if (!groupId) return;

    recentGroupId.value = groupId;
    hw.post(groupPath(groupId, '/visit')).catch(() => {
      // Only the next sign-in's landing page depends on it.
    });
  }

  async function createGroup(
    name: string,
    /** An upload from `uploadGroupAvatar`. */
    avatarId?: string,
    groupType: GroupType = 'regular',
    daltonEnabled = false,
  ): Promise<{ ok: true; groupId: string } | ErrResult> {
    try {
      const { data } = await hw.post<{ ok: boolean; groupId: string }>(
        '/groups',
        { groupName: name, avatarId, groupType, daltonEnabled },
      );
      await checkAuthStatus();
      return { ok: true, groupId: data.groupId };
    } catch (error: unknown) {
      return {
        ok: false,
        error: errorMessage(error, i18n.global.t('auth.groups.errors.generic')),
      };
    }
  }

  async function logout(): Promise<void> {
    try {
      await hw.post('/auth/logout');
    } catch {
      // Local state is cleared regardless of what the server replies.
    } finally {
      clearAuthState();
    }
  }

  async function logoutAllDevices(): Promise<void> {
    try {
      await hw.post('/auth/logout-all');
    } catch {
      // Local state is cleared regardless of what the server replies.
    } finally {
      clearAuthState();
    }
  }

  /** Mirrors the server's verdict for the group on screen; the server still enforces it. */
  function checkPermission(permissionKey: PermissionKey): boolean {
    return activePermissions.value.has(permissionKey);
  }

  function canInAnyGroup(permissionKey: PermissionKey): boolean {
    return userGroups.value.some((group) =>
      group.effectivePermissions.includes(permissionKey),
    );
  }

  async function createInvite(
    groupId: string,
  ): Promise<{ ok: boolean; token?: string; error?: string }> {
    try {
      const { data } = await hw.post<{ token: string }>(
        groupPath(groupId, '/invites'),
      );
      return { ok: true, token: data.token };
    } catch (error: unknown) {
      return {
        ok: false,
        error: errorMessage(
          error,
          i18n.global.t('auth.groups.errors.invite_create_failed'),
        ),
      };
    }
  }

  async function getInvite(token: string): Promise<{
    ok: boolean;
    groupName?: string;
    avatarUrl?: string;
    memberCount?: number;
    alreadyMember?: boolean;
    groupId?: string;
    error?: string;
  }> {
    try {
      const { data } = await hw.get(`/invites/${encodeURIComponent(token)}`);
      return {
        ok: true,
        groupName: data.groupName,
        avatarUrl: data.avatarUrl,
        memberCount: data.memberCount,
        alreadyMember: data.alreadyMember === true,
        groupId: data.groupId ?? undefined,
      };
    } catch (error: unknown) {
      return {
        ok: false,
        error: errorMessage(error, i18n.global.t('auth.groups.errors.generic')),
      };
    }
  }

  async function acceptInvite(token: string): Promise<{
    ok: boolean;
    groupId?: string;
    alreadyMember?: boolean;
    error?: string;
  }> {
    try {
      const { data } = await hw.post(
        `/invites/${encodeURIComponent(token)}/accept`,
      );
      const alreadyMember = data.alreadyMember === true;
      if (!alreadyMember) await checkAuthStatus();
      return { ok: true, groupId: data.groupId, alreadyMember };
    } catch (error: unknown) {
      return {
        ok: false,
        error: errorMessage(error, i18n.global.t('auth.groups.errors.generic')),
      };
    }
  }

  return {
    isAuthenticated,
    isLoggedIn,
    isAuthReady,
    groupName,
    activeGroupId,
    contextGroupId,
    homeRoute,
    activeGroup,
    activeGroupOwnerId,
    activeGroupAvatarUrl,
    activeGroupPermissions,
    activeGroupType,
    activeGroupDaltonEnabled,
    activePermissions,
    activeScheduleConfig,
    userGroups,
    findGroup,
    canInAnyGroup,
    initAuth,
    checkAuthStatus,
    canShowGroup,
    showGroup,
    setCourseSetup,
    createGroup,
    logout,
    logoutAllDevices,
    checkPermission,
    createInvite,
    getInvite,
    acceptInvite,
  };
}
