import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '@/api/hwApi';
import type {
  GroupMember,
  GroupStats,
  ScheduleSubstitution,
  AdminAnnouncement,
} from '@/modules/admin/types';
import type { Lesson } from '@/modules/schedule/types';
import { useToast } from '@/common/composables/useToast';

export function useGroupAdmin() {
  const route = useRoute();
  const { groupName: authGroupName, checkAuthStatus } = useAppAuth();
  const { success, error: toastError } = useToast();

  const groupId = computed(() => route.params.groupId as string);
  const groupName = computed(() => authGroupName.value || 'Group');

  // UI State
  const activeTab = ref('overview');

  // Stats
  const stats = ref<GroupStats | null>(null);
  const loadingStats = ref(false);

  // Members
  const members = ref<GroupMember[]>([]);
  const loadingMembers = ref(false);

  // Banned Users
  const bannedUsers = ref<{ userId: string; generatedName: string; bannedAt: string }[]>([]);
  const loadingBannedUsers = ref(false);

  // Schedule substitutions
  const subs = ref<ScheduleSubstitution[]>([]);
  const loadingSubs = ref(false);
  const savingSub = ref(false);

  // Schedule
  const lessons = ref<Lesson[]>([]);
  const loadingLessons = ref(false);

  // Announcements
  const announcements = ref<AdminAnnouncement[]>([]);
  const creatingAnn = ref(false);

  // Cleanup
  const cleaningUp = ref(false);

  // Group settings
  const editingGroupName = ref(false);
  const newGroupName = ref('');
  const savingGroupName = ref(false);

  // ─── Helpers ────────────────────────────────────────

  function showMessage(msg: string, isError = false) {
    if (isError) {
      toastError(msg);
    } else {
      success(msg);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Stats ──────────────────────────────────────────

  async function loadStats() {
    loadingStats.value = true;
    try {
      const { data } = await hw.get('/api/group-admin/stats');
      stats.value = data;
    } catch {
      showMessage('Failed to load statistics', true);
    } finally {
      loadingStats.value = false;
    }
  }

  // ─── Members ────────────────────────────────────────

  async function loadMembers() {
    loadingMembers.value = true;
    try {
      const { data } = await hw.get('/api/group-admin/members');
      members.value = data;
    } catch {
      showMessage('Failed to load members', true);
    } finally {
      loadingMembers.value = false;
    }
  }

  async function changeRole(userId: string, newRole: string) {
    try {
      await hw.patch(`/api/group-admin/members/${userId}/role`, {
        role: newRole,
      });
      const member = members.value.find((m) => m.userId === userId);
      if (member) member.role = newRole;
      showMessage('Role updated');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      showMessage(err.response?.data?.error || 'Failed to change role', true);
      await loadMembers();
    }
  }

  async function removeMember(userId: string, name: string, ban = false) {
    try {
      await hw.delete(`/api/group-admin/members/${userId}?ban=${ban}`);
      members.value = members.value.filter((m) => m.userId !== userId);
      showMessage(ban ? 'Member removed and banned' : 'Member removed');
      loadStats();
      if (ban) loadBannedUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      showMessage(err.response?.data?.error || 'Failed to remove member', true);
    }
  }

  // ─── Banned Users ───────────────────────────────────

  async function loadBannedUsers() {
    loadingBannedUsers.value = true;
    try {
      const { data } = await hw.get('/api/group-admin/banned-users');
      bannedUsers.value = data;
    } catch {
      showMessage('Failed to load banned users', true);
    } finally {
      loadingBannedUsers.value = false;
    }
  }

  async function revertBan(userId: string) {
    try {
      await hw.delete(`/api/group-admin/banned-users/${userId}`);
      bannedUsers.value = bannedUsers.value.filter((u) => u.userId !== userId);
      showMessage('Ban reverted');
    } catch {
      showMessage('Failed to revert ban', true);
    }
  }

  // ─── Schedule Substitutions ─────────────────────────

  async function loadSchedule() {
    loadingLessons.value = true;
    try {
      const { data } = await hw.get('/api/group-admin/schedule');
      lessons.value = data;
    } catch {
      showMessage('Failed to load schedule', true);
    } finally {
      loadingLessons.value = false;
    }
  }

  async function loadSubs() {
    loadingSubs.value = true;
    try {
      const { data } = await hw.get('/api/group-admin/schedule/subs');
      subs.value = data;
    } catch {
      showMessage('Failed to load substitutions', true);
    } finally {
      loadingSubs.value = false;
    }
  }

  async function saveSub(subData: Record<string, unknown>) {
    if (!subData.lessonId) return;
    savingSub.value = true;
    try {
      await hw.post('/api/group-admin/schedule/subs', subData);
      await loadSubs();
      showMessage('Substitution saved');
    } catch {
      showMessage('Failed to save substitution', true);
    } finally {
      savingSub.value = false;
    }
  }

  async function deleteSub(id: string) {
    if (!confirm('Delete substitution?')) return;
    try {
      await hw.delete(`/api/group-admin/schedule/subs/${id}`);
      subs.value = subs.value.filter((s) => s.id !== id);
      showMessage('Substitution deleted');
    } catch {
      showMessage('Failed to delete substitution', true);
    }
  }

  // ─── Announcements ──────────────────────────────────

  async function loadAnnouncements() {
    try {
      const { data } = await hw.get('/api/schedule/announcements');
      announcements.value = data;
    } catch {
      /* ignore */
    }
  }

  async function createAnnouncement(content: string, color: string) {
    if (!content.trim()) return;
    creatingAnn.value = true;
    try {
      await hw.post('/api/group-admin/announcements', {
        content: content.trim(),
        color,
      });
      await loadAnnouncements();
      showMessage('Announcement created');
    } catch {
      showMessage('Failed to create announcement', true);
    } finally {
      creatingAnn.value = false;
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete announcement?')) return;
    try {
      await hw.delete(`/api/group-admin/announcements/${id}`);
      announcements.value = announcements.value.filter((a) => a.id !== id);
      showMessage('Announcement deleted');
    } catch {
      showMessage('Failed to delete announcement', true);
    }
  }

  // ─── Cleanup ────────────────────────────────────────

  async function cleanupOldItems() {
    if (!confirm('Delete all entries older than 90 days?')) return;
    cleaningUp.value = true;
    try {
      const { data } = await hw.delete('/api/group-admin/cleanup/old-items');
      showMessage(data.message || 'Cleanup completed');
      await loadStats();
    } catch {
      showMessage('Cleanup failed', true);
    } finally {
      cleaningUp.value = false;
    }
  }

  // ─── Group Settings ─────────────────────────────────

  function startEditGroupName() {
    newGroupName.value = groupName.value || '';
    editingGroupName.value = true;
  }

  function cancelEditGroupName() {
    editingGroupName.value = false;
    newGroupName.value = '';
  }

  async function saveGroupName() {
    if (!newGroupName.value.trim()) return;
    savingGroupName.value = true;
    try {
      await hw.patch('/api/group-admin/settings', {
        name: newGroupName.value.trim(),
      });
      showMessage('Group name updated');
      editingGroupName.value = false;
      await checkAuthStatus();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      showMessage(
        err.response?.data?.error || 'Failed to save group name',
        true,
      );
    } finally {
      savingGroupName.value = false;
    }
  }

  async function updateGroupPassword(oldPassword: string, newPassword: string) {
    try {
      await hw.patch('/api/group-admin/password', { oldPassword, newPassword });
      showMessage('Password changed successfully');
      return true;
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string; error?: string } };
      };
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to change password';
      showMessage(msg, true);
      throw new Error(msg);
    }
  }

  async function deleteGroup() {
    try {
      await hw.delete('/api/group-admin');
      showMessage('Group deleted successfully');
      return true;
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string; error?: string } };
      };
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to delete group';
      showMessage(msg, true);
      throw new Error(msg);
    }
  }

  async function transferOwnership(targetUserId: string) {
    if (
      !confirm(
        'Are you sure you want to transfer ownership? You will lose your owner rights.',
      )
    )
      return;
    try {
      await hw.post('/api/group-admin/transfer-ownership', { targetUserId });
      showMessage('Ownership transferred successfully');
      await checkAuthStatus();
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string; error?: string } };
      };
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Transfer failed';
      showMessage(msg, true);
    }
  }

  // ─── Init ───────────────────────────────────────────

  onMounted(() => {
    loadStats();
    loadMembers();
    loadBannedUsers();
    loadSubs();
    loadAnnouncements();
    loadSchedule();
  });

  return {
    groupId,
    groupName,
    activeTab,

    // Stats
    stats,
    loadingStats,
    loadStats,

    // Members
    members,
    loadingMembers,
    loadMembers,
    changeRole,
    removeMember,

    // Banned Users
    bannedUsers,
    loadingBannedUsers,
    loadBannedUsers,
    revertBan,

    // Subs
    subs,
    loadingSubs,
    savingSub,
    loadSubs,
    saveSub,
    deleteSub,

    // Schedule
    lessons,
    loadingLessons,
    loadSchedule,

    // Announcements
    announcements,
    creatingAnn,
    loadAnnouncements,
    createAnnouncement,
    deleteAnnouncement,

    // Cleanup
    cleaningUp,
    cleanupOldItems,

    // Settings
    editingGroupName,
    newGroupName,
    savingGroupName,
    startEditGroupName,
    cancelEditGroupName,
    saveGroupName,
    updateGroupPassword,
    deleteGroup,
    transferOwnership,

    // Helpers
    showMessage,
    formatDate,
  };
}
