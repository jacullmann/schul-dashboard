import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import type { Attachment, HwItem } from '@/modules/tasks/types';
import type { PermissionKey } from '@/types/permissions';

type OwnedBy = { createdBy?: string | null };

/**
 * Mirrors the server's rules for the tasks of one group, so the UI only offers
 * what the server accepts. Own tasks stay editable and deletable whatever the
 * group's matrix says; owners and superadmins arrive with every permission.
 */
export function useTaskPermissions(groupId: MaybeRefOrGetter<string>) {
  const { findGroup } = useAppAuth();
  const { user } = storeToRefs(useUserStore());

  const permissions = computed(
    () =>
      new Set<PermissionKey>(
        findGroup(toValue(groupId))?.effectivePermissions ?? [],
      ),
  );

  const can = (permission: PermissionKey) => permissions.value.has(permission);

  const isOwn = ({ createdBy }: OwnedBy) =>
    !!user.value && !!createdBy && createdBy === user.value.id;

  const canUploadImages = computed(() => can('upload_images'));
  const canManageNotes = computed(() => can('manage_notes'));
  const canSeeCreator = computed(() => can('moderate_members'));

  const canEdit = (item: Pick<HwItem, 'createdBy'>) =>
    isOwn(item) || can('edit_other_content');

  const canDelete = (item: Pick<HwItem, 'createdBy'>) =>
    isOwn(item) || can('delete_other_content');

  const canDeleteImage = (
    item: Pick<HwItem, 'createdBy'>,
    image: Pick<Attachment, 'createdBy'>,
  ) => isOwn(item) || isOwn(image) || can('delete_other_content');

  return {
    canUploadImages,
    canManageNotes,
    canSeeCreator,
    canEdit,
    canDelete,
    canDeleteImage,
  };
}

export type TaskPermissions = ReturnType<typeof useTaskPermissions>;
