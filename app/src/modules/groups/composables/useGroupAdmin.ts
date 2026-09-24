import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '@/api/api.ts';
import type {
  GroupMember,
  GroupStats,
  ScheduleSubstitution,
  AdminAnnouncement,
  GroupInviteLog,
} from '@/modules/groups/types';
import type { Lesson, ScheduleConfig } from '@/modules/schedule/types';
import type { GroupType } from '@/types/groups';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';
import { apiErrorMessage } from '@/api/errors';

export function useGroupAdmin() {
  const modalStore = useModalStore();
  const { t } = useI18n();

  const route = useRoute();
  const {
    groupName: authGroupName,
    checkAuthStatus,
    checkPermission,
  } = useAppAuth();
  const { success, error: toastError } = useToast();

  const groupId = computed(() => route.params.groupId as string);
  const groupName = computed(
    () => authGroupName.value || t('groups.settings.group_fallback'),
  );

  const activeTab = ref('overview');

  const stats = ref<GroupStats | null>(null);
  const loadingStats = ref(false);

  const members = ref<GroupMember[]>([]);
  const loadingMembers = ref(false);

  const bannedUsers = ref<
    { userId: string; generatedName: string; bannedAt: string }[]
  >([]);
  const loadingBannedUsers = ref(false);

  const invites = ref<GroupInviteLog[]>([]);
  const loadingInvites = ref(false);

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
  const savingGroupType = ref(false);
  const savingDaltonEnabled = ref(false);

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
      showMessage(t('groups.settings.messages.load_stats_failed'), true);
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
      showMessage(t('groups.settings.messages.load_members_failed'), true);
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
      showMessage(t('groups.settings.messages.role_updated'));
    } catch (e: unknown) {
      showMessage(
        apiErrorMessage(e, t('groups.settings.messages.role_update_failed')),
        true,
      );
      await loadMembers();
    }
  }

  async function removeMember(userId: string, _name: string, ban = false) {
    try {
      await hw.delete(`/group-admin/members/${userId}?ban=${ban}`);
      members.value = members.value.filter((m) => m.userId !== userId);
      showMessage(
        ban
          ? t('groups.settings.messages.member_removed_banned')
          : t('groups.settings.messages.member_removed'),
      );
      await loadStats();
      if (ban) await loadBannedUsers();
    } catch (e: unknown) {
      showMessage(
        apiErrorMessage(e, t('groups.settings.messages.member_remove_failed')),
        true,
      );
    }
  }

  async function loadBannedUsers() {
    loadingBannedUsers.value = true;
    try {
      const { data } = await hw.get('/group-admin/banned-users');
      bannedUsers.value = data;
    } catch {
      showMessage(t('groups.settings.messages.load_banned_failed'), true);
    } finally {
      loadingBannedUsers.value = false;
    }
  }

  async function revertBan(userId: string) {
    try {
      await hw.delete(`/group-admin/banned-users/${userId}`);
      bannedUsers.value = bannedUsers.value.filter((u) => u.userId !== userId);
      showMessage(t('groups.settings.messages.ban_reverted'));
    } catch {
      showMessage(t('groups.settings.messages.ban_revert_failed'), true);
    }
  }

  const savingLesson = ref(false);

  async function loadSchedule() {
    loadingLessons.value = true;
    try {
      const { data } = await hw.get('/group-admin/schedule');
      lessons.value = data;
    } catch {
      showMessage(t('groups.settings.messages.load_schedule_failed'), true);
    } finally {
      loadingLessons.value = false;
    }
  }

  async function saveLesson(
    lessonData: Record<string, unknown>,
  ): Promise<boolean> {
    savingLesson.value = true;
    try {
      await hw.post('/group-admin/schedule', lessonData);
      await loadSchedule();
      showMessage(t('groups.settings.schedule.editor.success_save_lesson'));
      return true;
    } catch {
      showMessage(t('groups.settings.messages.lesson_save_failed'), true);
      return false;
    } finally {
      savingLesson.value = false;
    }
  }

  async function deleteLesson(lessonId: string): Promise<boolean> {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.schedule.editor.delete_confirm_title'),
      content: t('groups.settings.schedule.editor.delete_confirm_message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return false;
    savingLesson.value = true;
    try {
      await hw.delete(`/group-admin/schedule/${lessonId}`);
      await loadSchedule();
      showMessage(t('groups.settings.schedule.editor.success_delete_lesson'));
      return true;
    } catch {
      showMessage(t('groups.settings.messages.lesson_delete_failed'), true);
      return false;
    } finally {
      savingLesson.value = false;
    }
  }

  async function loadSubs() {
    loadingSubs.value = true;
    try {
      const { data } = await hw.get('/group-admin/schedule/subs');
      subs.value = data;
    } catch {
      showMessage(
        t('groups.settings.messages.load_substitutions_failed'),
        true,
      );
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
      showMessage(t('groups.settings.messages.substitution_saved'));
    } catch {
      showMessage(t('groups.settings.messages.substitution_save_failed'), true);
    } finally {
      savingSub.value = false;
    }
  }

  const savingScheduleConfig = ref(false);

  type ScheduleLessonPayload = {
    id?: string;
    day: number;
    slot: number;
    duration: number;
    room: string | null;
    subjectId: string | null;
    courseId: string | null;
    isDalton: boolean;
  };

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function createScheduleLessonPayload(lesson: Lesson): ScheduleLessonPayload {
    const isDalton = lesson.isDalton === true;
    const subjectId = isDalton
      ? null
      : (lesson.subjectId ?? lesson.subjects?.id ?? null);
    const courseId = isDalton
      ? null
      : (lesson.courseId ?? lesson.courses?.id ?? null);

    return {
      ...(uuidPattern.test(lesson.id) ? { id: lesson.id } : {}),
      day: Number(lesson.day),
      slot: Number(lesson.slot),
      duration: Number(lesson.duration),
      room: lesson.room?.trim() || null,
      subjectId,
      courseId,
      isDalton,
    };
  }

  function getScheduleSaveError(error: unknown): string {
    if (!axios.isAxiosError<{ error?: string }>(error)) {
      return t('groups.settings.schedule.editor.save_all_failed');
    }

    if (error.response?.status === 405) {
      return t('groups.settings.schedule.editor.save_service_unavailable');
    }

    return apiErrorMessage(
      error,
      t('groups.settings.schedule.editor.save_all_failed'),
    );
  }

  async function saveScheduleBatch(
    updatedLessons: Lesson[],
    configPayload: ScheduleConfig,
    onSuccess?: () => void,
  ): Promise<boolean> {
    savingScheduleConfig.value = true;
    try {
      await hw.put('/group-admin/schedule', {
        lessons: updatedLessons.map(createScheduleLessonPayload),
        scheduleConfig: configPayload,
      });
      await Promise.all([checkAuthStatus(), loadSchedule()]);
      showMessage(t('groups.settings.schedule.editor.success_save_all'));
      if (onSuccess) onSuccess();
      return true;
    } catch (error: unknown) {
      showMessage(getScheduleSaveError(error), true);
      return false;
    } finally {
      savingScheduleConfig.value = false;
    }
  }

  async function updateScheduleConfig(scheduleConfig: ScheduleConfig) {
    savingScheduleConfig.value = true;
    try {
      await hw.patch('/group-admin/schedule-config', { scheduleConfig });
      await useAppAuth().checkAuthStatus();
      showMessage(t('groups.settings.messages.schedule_config_updated'));
    } catch {
      showMessage(
        t('groups.settings.messages.schedule_config_update_failed'),
        true,
      );
    } finally {
      savingScheduleConfig.value = false;
    }
  }

  async function deleteSub(id: string) {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.schedule.changes.delete_modal.title'),
      content: t('groups.settings.schedule.changes.delete_modal.message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.delete(`/group-admin/schedule/subs/${id}`);
      subs.value = subs.value.filter((s) => s.id !== id);
      showMessage(t('groups.settings.messages.substitution_deleted'));
    } catch {
      showMessage(
        t('groups.settings.messages.substitution_delete_failed'),
        true,
      );
    }
  }

  async function loadAnnouncements() {
    try {
      const { data } = await hw.get('/schedule/announcements');
      announcements.value = data;
    } catch {
      // Announcements are supplementary; keep the previously loaded list.
    }
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
      showMessage(t('groups.settings.messages.announcement_created'));
    } catch {
      showMessage(
        t('groups.settings.messages.announcement_create_failed'),
        true,
      );
    } finally {
      creatingAnn.value = false;
    }
  }

  async function deleteAnnouncement(id: string) {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.announcements.delete_modal.title'),
      content: t('groups.settings.announcements.delete_modal.message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.delete(`/group-admin/announcements/${id}`);
      announcements.value = announcements.value.filter((a) => a.id !== id);
      showMessage(t('groups.settings.messages.announcement_deleted'));
    } catch {
      showMessage(
        t('groups.settings.messages.announcement_delete_failed'),
        true,
      );
    }
  }

  async function cleanupOldItems() {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.overview.cleanup.modal.title'),
      content: t('groups.settings.overview.cleanup.modal.message'),
      submitText: t('common.buttons.confirm'),
      danger: true,
    });

    if (!isConfirmed) return;
    cleaningUp.value = true;
    try {
      const { data } = await hw.delete('/group-admin/cleanup/old-items');
      showMessage(
        data.message || t('groups.settings.messages.cleanup_completed'),
      );
      await loadStats();
    } catch {
      showMessage(t('groups.settings.messages.cleanup_failed'), true);
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
      showMessage(t('groups.settings.messages.group_name_updated'));
      editingGroupName.value = false;
      await checkAuthStatus();
    } catch (e: unknown) {
      showMessage(
        apiErrorMessage(
          e,
          t('groups.settings.messages.group_name_save_failed'),
        ),
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
          ? t('groups.settings.general.avatar.errors.update_success')
          : t('groups.settings.general.avatar.errors.delete_success'),
      );
      await checkAuthStatus();
    } catch (e: unknown) {
      showMessage(
        apiErrorMessage(
          e,
          t('groups.settings.general.avatar.errors.save_group_picture'),
        ),
        true,
      );
      throw e;
    }
  }

  async function saveGroupType(groupType: GroupType): Promise<boolean> {
    savingGroupType.value = true;
    try {
      await hw.patch('/group-admin/settings', { groupType });
      await checkAuthStatus();
      showMessage(t('groups.settings.general.group_type.success'));
      return true;
    } catch (e: unknown) {
      showMessage(
        apiErrorMessage(e, t('groups.settings.general.group_type.failed')),
        true,
      );
      return false;
    } finally {
      savingGroupType.value = false;
    }
  }

  async function saveDaltonEnabled(daltonEnabled: boolean): Promise<boolean> {
    savingDaltonEnabled.value = true;
    try {
      await hw.patch('/group-admin/settings', { daltonEnabled });
      await checkAuthStatus();
      showMessage(t('groups.settings.general.dalton.success'));
      return true;
    } catch (e: unknown) {
      showMessage(
        apiErrorMessage(e, t('groups.settings.general.dalton.failed')),
        true,
      );
      return false;
    } finally {
      savingDaltonEnabled.value = false;
    }
  }

  async function deleteGroup() {
    try {
      await hw.delete('/group-admin');
      showMessage(t('groups.settings.messages.group_deleted'));
      return true;
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string; error?: string } };
      };
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        t('groups.settings.messages.group_delete_failed');
      showMessage(msg, true);
      throw new Error(msg);
    }
  }

  async function transferOwnership(targetUserId: string) {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.members.transfer_modal.title'),
      content: t('groups.settings.members.transfer_modal.message'),
      submitText: t('groups.settings.members.transfer_modal.submit'),
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.post('/group-admin/transfer-ownership', { targetUserId });
      showMessage(t('groups.settings.messages.ownership_transferred'));
      await checkAuthStatus();
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string; error?: string } };
      };
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        t('groups.settings.messages.ownership_transfer_failed');
      showMessage(msg, true);
    }
  }

  async function loadInvites() {
    if (!checkPermission('invite_members')) return;
    loadingInvites.value = true;
    try {
      const { data } = await hw.get('/group-admin/invites');
      invites.value = data;
    } catch {
      showMessage(t('groups.settings.messages.load_invites_failed'), true);
    } finally {
      loadingInvites.value = false;
    }
  }

  async function revokeInvite(id: string) {
    try {
      await hw.delete(`/group-admin/invites/${id}`);
      showMessage(t('groups.settings.messages.invite_revoked'));
      await loadInvites();
    } catch {
      showMessage(t('groups.settings.messages.invite_revoke_failed'), true);
    }
  }

  onMounted(() => {
    void loadStats();
    void loadMembers();
    void loadBannedUsers();
    void loadSubs();
    void loadAnnouncements();
    void loadSchedule();
    if (checkPermission('invite_members')) {
      void loadInvites();
    }
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

    invites,
    loadingInvites,
    loadInvites,
    revokeInvite,

    subs,
    loadingSubs,
    savingSub,
    savingScheduleConfig,
    loadSubs,
    saveSub,
    updateScheduleConfig,
    saveScheduleBatch,
    deleteSub,

    lessons,
    loadingLessons,
    savingLesson,
    loadSchedule,
    saveLesson,
    deleteLesson,

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
    savingGroupType,
    saveGroupType,
    savingDaltonEnabled,
    saveDaltonEnabled,
    deleteGroup,
    transferOwnership,

    showMessage,
    formatDate,
  };
}
