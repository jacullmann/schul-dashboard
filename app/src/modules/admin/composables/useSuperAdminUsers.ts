import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import type { SuperAdminUser, SuperAdminUserActivity } from '../types';
import { useSuperAdminStats } from './useSuperAdminStats';

const users = ref<SuperAdminUser[]>([]);
const loadingUsers = ref(false);
const activities = ref<Record<string, SuperAdminUserActivity[]>>({});
const loadingActivities = ref<Record<string, boolean>>({});

export function useSuperAdminUsers() {
  const toast = useToast();
  const modalStore = useModalStore();
  const { t } = useI18n();
  const { loadStats } = useSuperAdminStats();

  async function loadUsers() {
    loadingUsers.value = true;
    try {
      const { data } = await hw.get('/admin/all-users');
      users.value = data;
    } catch {
      toast.error(t('admin.users.errors.load'));
    } finally {
      loadingUsers.value = false;
    }
  }

  async function fetchActivity(userId: string): Promise<boolean> {
    loadingActivities.value[userId] = true;
    try {
      const { data } = await hw.get(`/admin/users/${userId}/activity`);
      activities.value[userId] = data;
      return true;
    } catch {
      toast.error(t('admin.users.errors.load_activity'));
      return false;
    } finally {
      loadingActivities.value[userId] = false;
    }
  }

  async function toggleBan(u: SuperAdminUser) {
    if (u.role === 'superadmin') return;
    try {
      if (u.isBanned) {
        await hw.delete(`/admin/users/${u.id}/ban`);
        u.isBanned = false;
        toast.success(t('admin.users.unban_success'));
      } else {
        await hw.post(`/admin/users/${u.id}/ban`);
        u.isBanned = true;
        toast.success(t('admin.users.ban_success'));
      }
      await loadStats();
    } catch {
      toast.error(t('admin.errors.action_failed'));
    }
  }

  async function deleteUser(id: string) {
    const confirmed = await modalStore.confirm({
      title: t('admin.users.delete_modal.title'),
      content: t('admin.users.delete_modal.content'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/users/${id}`);
      users.value = users.value.filter((u) => u.id !== id);
      toast.success(t('admin.users.delete_success'));
      await loadStats();
    } catch {
      toast.error(t('admin.users.errors.delete'));
    }
  }

  async function pruneOldLogs(u: SuperAdminUser) {
    const confirmed = await modalStore.confirm({
      title: t('admin.users.prune_modal.title'),
      content: t('admin.users.prune_modal.content', { email: u.email }),
      submitText: t('admin.users.prune_modal.submit'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/users/${u.id}/activity/prune`);
      toast.success(t('admin.users.prune_success'));
    } catch {
      toast.error(t('admin.users.errors.prune'));
    }
  }

  return {
    users,
    loadingUsers,
    activities,
    loadingActivities,
    loadUsers,
    fetchActivity,
    toggleBan,
    deleteUser,
    pruneOldLogs,
  };
}
