import { ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import type {
  MemberRole,
  SuperAdminMembership,
  SuperAdminUserActivity,
} from '../types';

export function useSuperAdminUserDetails(userId: Ref<string | null>) {
  const toast = useToast();
  const { t } = useI18n();

  const memberships = ref<SuperAdminMembership[]>([]);
  const activity = ref<SuperAdminUserActivity[]>([]);
  const loading = ref(false);
  const changingGroupId = ref<string | null>(null);

  async function load(id: string) {
    loading.value = true;
    try {
      const [groupsRes, activityRes] = await Promise.all([
        hw.get<SuperAdminMembership[]>(`/admin/users/${id}/groups`),
        hw.get<SuperAdminUserActivity[]>(`/admin/users/${id}/activity`),
      ]);
      // A slow response for a previously opened user must not overwrite this one.
      if (userId.value !== id) return;
      memberships.value = groupsRes.data;
      activity.value = activityRes.data;
    } catch {
      toast.error(t('admin.users.errors.load_details'));
    } finally {
      if (userId.value === id) loading.value = false;
    }
  }

  async function changeRole(
    membership: SuperAdminMembership,
    role: MemberRole,
  ) {
    const id = userId.value;
    if (!id || role === membership.role) return;

    changingGroupId.value = membership.groupId;
    try {
      await hw.patch(`/admin/users/${id}/groups/${membership.groupId}/role`, {
        role,
      });
      toast.success(t('admin.users.details.role_changed'));
      // Transferring ownership also changes the previous owner, and the
      // assignable roles follow the new role, so the server stays the source.
      const { data } = await hw.get<SuperAdminMembership[]>(
        `/admin/users/${id}/groups`,
      );
      if (userId.value === id) memberships.value = data;
    } catch {
      toast.error(t('admin.errors.action_failed'));
    } finally {
      changingGroupId.value = null;
    }
  }

  watch(
    userId,
    (id) => {
      memberships.value = [];
      activity.value = [];
      if (id) void load(id);
    },
    { immediate: true },
  );

  return { memberships, activity, loading, changingGroupId, changeRole };
}
