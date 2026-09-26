import { computed } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';

export const GROUP_SETTINGS_TABS = [
  'general',
  'members',
  'permissions',
  'schedule',
  'subjects',
  'announcements',
] as const;

export type GroupSettingsTab = (typeof GROUP_SETTINGS_TABS)[number];

function isGroupSettingsTab(tab: string): tab is GroupSettingsTab {
  return (GROUP_SETTINGS_TABS as readonly string[]).includes(tab);
}

// Mirrors the checks of the /group-admin endpoints each tab depends on, so a
// tab is only offered when its data can actually be loaded.
export function useGroupSettingsAccess() {
  const { checkPermission, activeGroupOwnerId } = useAppAuth();
  const userStore = useUserStore();

  const isOwner = computed(
    () =>
      !!userStore.user?.id && activeGroupOwnerId.value === userStore.user.id,
  );
  const canManagePermissions = computed(
    () => isOwner.value || userStore.isSuperadmin,
  );

  function canAccessTab(tab: string): boolean {
    if (!isGroupSettingsTab(tab)) return false;

    switch (tab) {
      case 'general':
        return checkPermission('edit_group_general');
      case 'members':
        return checkPermission('moderate_members');
      case 'permissions':
        return canManagePermissions.value;
      case 'schedule':
        return (
          checkPermission('edit_schedule') ||
          checkPermission('manage_schedule_changes')
        );
      case 'subjects':
        return checkPermission('edit_subjects_courses');
      case 'announcements':
        return checkPermission('manage_announcements');
    }
  }

  const accessibleTabs = computed(() =>
    GROUP_SETTINGS_TABS.filter(canAccessTab),
  );
  const canAccessGroupSettings = computed(
    () => accessibleTabs.value.length > 0,
  );

  return {
    isOwner,
    canManagePermissions,
    canAccessTab,
    accessibleTabs,
    canAccessGroupSettings,
  };
}
