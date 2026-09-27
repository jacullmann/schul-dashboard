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
  // Superadmins act with the owner's rights in every group, mirroring the
  // backend's `TenantContext::has_owner_rights`.
  const hasOwnerRights = computed(
    () => isOwner.value || userStore.isSuperadmin,
  );

  return { hasOwnerRights };
}
