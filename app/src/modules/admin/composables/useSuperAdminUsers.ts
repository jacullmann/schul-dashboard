import { ref } from 'vue';
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
  const { loadStats } = useSuperAdminStats();

  async function loadUsers() {
    loadingUsers.value = true;
    try {
      const { data } = await hw.get('/admin/all-users');
      users.value = data;
    } catch {
      toast.error('Failed to load users.');
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
      toast.error('Failed to load activity.');
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
        toast.success('User unbanned.');
      } else {
        await hw.post(`/admin/users/${u.id}/ban`);
        u.isBanned = true;
        toast.success('User banned.');
      }
      await loadStats();
    } catch {
      toast.error('Action failed.');
    }
  }

  async function deleteUser(id: string) {
    const confirmed = await modalStore.confirm({
      title: 'Delete User?',
      content: 'Are you sure you want to delete this user?',
      submitText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/users/${id}`);
      users.value = users.value.filter((u) => u.id !== id);
      toast.success('User deleted.');
      await loadStats();
    } catch {
      toast.error('Failed to delete user.');
    }
  }

  async function pruneOldLogs(u: SuperAdminUser) {
    const confirmed = await modalStore.confirm({
      title: 'Prune logs?',
      content: `Delete activity logs older than 30 days for ${u.email}?`,
      submitText: 'Prune',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/users/${u.id}/activity/prune`);
      toast.success('Logs pruned.');
    } catch {
      toast.error('Failed to prune logs.');
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
