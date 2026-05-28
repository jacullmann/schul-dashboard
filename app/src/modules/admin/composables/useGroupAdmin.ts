import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '@/api/api.ts';
import type {
  GroupMember,
  GroupStats,
  ScheduleSubstitution,
  AdminAnnouncement,
} from '@/modules/admin/types';
import type { Lesson } from '@/modules/schedule/types';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';

export function useGroupAdmin() {
  const modalStore = useModalStore();
  const { t } = useI18n();

  const route = useRoute();
  const { groupName: authGroupName, checkAuthStatus } = useAppAuth();
  const { success, error: toastError } = useToast();

  const groupId = computed(() => route.params.groupId as string);
  const groupName = computed(() => authGroupName.value || 'Group');

  const activeTab = ref('overview');

  const stats = ref<GroupStats | null>(null);
  const loadingStats = ref(false);

  const members = ref<GroupMember[]>([]);
  const loadingMembers = ref(false);

  const bannedUsers = ref<
    { userId: string; generatedName: string; bannedAt: string }[]
  >([]);
  const loadingBannedUsers = ref(false);

  const subs = ref<ScheduleSubstitution[]>([]);
  const loadingSubs = ref(false);
  const savingSub = ref(false);

  const lessons = ref<Lesson[]>([]);
  const loadingLessons = ref(false);

  const announcements = ref<AdminAnnouncement[]>([]);
  const creatingAnn = ref(false);

  const cleaningUp = ref(false);

  const editingGroupName = ref(false);
  const newGroupName = ref('');
  const savingGroupName = ref(false);

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

  async function loadStats() {
    loadingStats.value = true;
    try {
      const { data } = await hw.get('/group-admin/stats');
      stats.value = data;
    } catch {
      showMessage('Failed to load statistics', true);
    } finally {
      loadingStats.value = false;
    }
  }

  async function loadMembers() {
    loadingMembers.value = true;
    try {
      const { data } = await hw.get('/group-admin/members');
      members.value = data;
    } catch {
      showMessage('Failed to load members', true);
    } finally {
      loadingMembers.value = false;
    }
  }

  async function changeRole(userId: string, newRole: string) {
    try {
      await hw.patch(`/group-admin/members/${userId}/role`, {
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

  async function removeMember(userId: string, _name: string, ban = false) {
    try {
      await hw.delete(`/group-admin/members/${userId}?ban=${ban}`);
      members.value = members.value.filter((m) => m.userId !== userId);
      showMessage(ban ? 'Member removed and banned' : 'Member removed');
      await loadStats();
      if (ban) await loadBannedUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      showMessage(err.response?.data?.error || 'Failed to remove member', true);
    }
  }

  async function loadBannedUsers() {
    loadingBannedUsers.value = true;
    try {
      const { data } = await hw.get('/group-admin/banned-users');
      bannedUsers.value = data;
    } catch {
      showMessage('Failed to load banned users', true);
    } finally {
      loadingBannedUsers.value = false;
    }
  }

  async function revertBan(userId: string) {
    try {
      await hw.delete(`/group-admin/banned-users/${userId}`);
      bannedUsers.value = bannedUsers.value.filter((u) => u.userId !== userId);
      showMessage('Ban reverted');
    } catch {
      showMessage('Failed to revert ban', true);
    }
  }

  async function loadSchedule() {
    loadingLessons.value = true;
    try {
      const { data } = await hw.get('/group-admin/schedule');
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
      const { data } = await hw.get('/group-admin/schedule/subs');
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
      await hw.post('/group-admin/schedule/subs', subData);
      await loadSubs();
      showMessage('Substitution saved');
    } catch {
      showMessage('Failed to save substitution', true);
    } finally {
      savingSub.value = false;
    }
  }

  const savingScheduleConfig = ref(false);

  async function updateScheduleConfig(scheduleConfig: Record<string, any>) {
    savingScheduleConfig.value = true;
    try {
      await hw.patch('/group-admin/schedule-config', { scheduleConfig });
      await useAppAuth().checkAuthStatus();
      showMessage('Schedule config updated');
    } catch {
      showMessage('Failed to update schedule config', true);
    } finally {
      savingScheduleConfig.value = false;
    }
  }

  async function deleteSub(id: string) {
    const isConfirmed = await modalStore.confirm({
      title: 'Delete Schedule Change?',
      content: 'If you delete this change, it will be removed permanently',
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.delete(`/group-admin/schedule/subs/${id}`);
      subs.value = subs.value.filter((s) => s.id !== id);
      showMessage('Substitution deleted');
    } catch {
      showMessage('Failed to delete substitution', true);
    }
  }

  async function loadAnnouncements() {
    try {
      const { data } = await hw.get('/schedule/announcements');
      announcements.value = data;
    } catch {}
  }

  async function createAnnouncement(content: string, color: string) {
    if (!content.trim()) return;
    creatingAnn.value = true;
    try {
      await hw.post('/group-admin/announcements', {
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
    const isConfirmed = await modalStore.confirm({
      title: 'Delete Announcement?',
      content: 'Are you sure you want to delete this announcement?',
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.delete(`/group-admin/announcements/${id}`);
      announcements.value = announcements.value.filter((a) => a.id !== id);
      showMessage('Announcement deleted');
    } catch {
      showMessage('Failed to delete announcement', true);
    }
  }

  async function cleanupOldItems() {
    const isConfirmed = await modalStore.confirm({
      title: 'Cleanup old items?',
      content: 'Delete all entries older than 90 days?',
      submitText: 'Confirm',
      danger: true,
    });

    if (!isConfirmed) return;
    cleaningUp.value = true;
    try {
      const { data } = await hw.delete('/group-admin/cleanup/old-items');
      showMessage(data.message || 'Cleanup completed');
      await loadStats();
    } catch {
      showMessage('Cleanup failed', true);
    } finally {
      cleaningUp.value = false;
    }
  }

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
      await hw.patch('/group-admin/settings', {
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

  async function saveGroupAvatar(avatarUrl: string | null) {
    try {
      await hw.patch('/group-admin/settings', {
        avatarUrl: avatarUrl ? avatarUrl.trim() : null,
      });
      showMessage(
        avatarUrl
          ? t('admin.general.avatar.errors.update_success')
          : t('admin.general.avatar.errors.delete_success'),
      );
      await checkAuthStatus();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      showMessage(
        err.response?.data?.error || 'Fehler beim Speichern des Gruppenbildes',
        true,
      );
      throw e;
    }
  }

  async function updateGroupPassword(oldPassword: string, newPassword: string) {
    try {
      await hw.patch('/group-admin/password', { oldPassword, newPassword });
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
      await hw.delete('/group-admin');
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
    const isConfirmed = await modalStore.confirm({
      title: 'Transfer Ownership?',
      content:
        'Are you sure you want to transfer ownership? You will lose your owner rights.',
      submitText: 'Transfer',
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.post('/group-admin/transfer-ownership', { targetUserId });
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

  onMounted(() => {
    void loadStats();
    void loadMembers();
    void loadBannedUsers();
    void loadSubs();
    void loadAnnouncements();
    void loadSchedule();
  });

  return {
    groupId,
    groupName,
    activeTab,

    stats,
    loadingStats,
    loadStats,

    members,
    loadingMembers,
    loadMembers,
    changeRole,
    removeMember,

    bannedUsers,
    loadingBannedUsers,
    loadBannedUsers,
    revertBan,

    subs,
    loadingSubs,
    savingSub,
    savingScheduleConfig,
    loadSubs,
    saveSub,
    updateScheduleConfig,
    deleteSub,

    lessons,
    loadingLessons,
    loadSchedule,

    announcements,
    creatingAnn,
    loadAnnouncements,
    createAnnouncement,
    deleteAnnouncement,

    cleaningUp,
    cleanupOldItems,

    editingGroupName,
    newGroupName,
    savingGroupName,
    startEditGroupName,
    cancelEditGroupName,
    saveGroupName,
    saveGroupAvatar,
    updateGroupPassword,
    deleteGroup,
    transferOwnership,

    showMessage,
    formatDate,
  };
}
