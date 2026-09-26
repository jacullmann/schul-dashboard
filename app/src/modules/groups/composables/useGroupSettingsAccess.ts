import { computed } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';

export function useGroupSettingsAccess() {
  const { activeGroupOwnerId } = useAppAuth();
  const userStore = useUserStore();

  const isOwner = computed(
    () =>
      !!userStore.user?.id && activeGroupOwnerId.value === userStore.user.id,
  );
  // The backend only lets the owner or a superadmin read and change the
  // group's permission matrix, since it defines every other member's rights.
  const canManagePermissions = computed(
    () => isOwner.value || userStore.isSuperadmin,
  );

  return { isOwner, canManagePermissions };
}
