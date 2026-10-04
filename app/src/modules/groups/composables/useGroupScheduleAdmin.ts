import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { isAxiosError } from 'axios';
import api from '@/api/api';
import { groupPath } from '@/api/groupPath';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type { ScheduleSubstitution } from '@/modules/groups/types';
import type { Lesson, ScheduleConfig } from '@/modules/schedule/types';
import { useConfirmModal } from '@/stores/modalStore';
import { isUuid } from '@/utils/uuid';

interface ScheduleLessonPayload {
  id?: string;
  day: number;
  slot: number;
  duration: number;
  room: string | null;
  subjectId: string | null;
  courseId: string | null;
  isDalton: boolean;
}

function scheduleLessonPayload(lesson: Lesson): ScheduleLessonPayload {
  const isDalton = lesson.isDalton === true;
  return {
    // Lessons drafted in the editor carry a temporary id the server never saw.
    ...(isUuid(lesson.id) ? { id: lesson.id } : {}),
    day: Number(lesson.day),
    slot: Number(lesson.slot),
    duration: Number(lesson.duration),
    room: lesson.room?.trim() || null,
    subjectId: isDalton
      ? null
      : (lesson.subjectId ?? lesson.subjects?.id ?? null),
    courseId: isDalton ? null : (lesson.courseId ?? lesson.courses?.id ?? null),
    isDalton,
  };
}

/** The group's weekly schedule and its substitutions, as admins edit them. */
export function useGroupScheduleAdmin() {
  const groupId = useGroupPageId();
  const { t } = useI18n();
  const toast = useToast();
  const confirmModal = useConfirmModal();
  const { checkAuthStatus, activeGroupDaltonEnabled } = useAppAuth();

  const lessons = ref<Lesson[]>([]);
  const loadingLessons = ref(false);
  const savingScheduleConfig = ref(false);

  const subs = ref<ScheduleSubstitution[]>([]);
  const loadingSubs = ref(false);
  const savingSub = ref(false);

  async function loadSchedule() {
    loadingLessons.value = true;
    try {
      const { data } = await api.get<Lesson[]>(
        groupPath(groupId, '/admin/schedule'),
      );
      lessons.value = data;
    } catch {
      toast.error(t('groups.settings.messages.load_schedule_failed'));
    } finally {
      loadingLessons.value = false;
    }
  }

  async function loadSubs() {
    loadingSubs.value = true;
    try {
      const { data } = await api.get<ScheduleSubstitution[]>(
        groupPath(groupId, '/admin/schedule/subs'),
      );
      subs.value = data;
    } catch {
      toast.error(t('groups.settings.messages.load_substitutions_failed'));
    } finally {
      loadingSubs.value = false;
    }
  }

  function scheduleSaveError(error: unknown): string {
    const fallback = t('groups.settings.schedule.editor.save_all_failed');
    if (isAxiosError(error) && error.response?.status === 405) {
      return t('groups.settings.schedule.editor.save_service_unavailable');
    }
    return apiErrorMessage(error, fallback);
  }

  async function saveScheduleBatch(
    updatedLessons: Lesson[],
    config: ScheduleConfig,
  ): Promise<boolean> {
    savingScheduleConfig.value = true;
    try {
      await api.put(groupPath(groupId, '/admin/schedule'), {
        lessons: updatedLessons.map(scheduleLessonPayload),
        scheduleConfig: config,
      });
      await Promise.all([checkAuthStatus(), loadSchedule()]);
      toast.success(t('groups.settings.schedule.editor.success_save_all'));
      return true;
    } catch (error) {
      toast.error(scheduleSaveError(error));
      return false;
    } finally {
      savingScheduleConfig.value = false;
    }
  }

  async function saveSub(subData: Record<string, unknown>) {
    if (!subData.lessonId) return;
    savingSub.value = true;
    try {
      await api.post(groupPath(groupId, '/admin/schedule/subs'), subData);
      await loadSubs();
      toast.success(t('groups.settings.messages.substitution_saved'));
    } catch {
      toast.error(t('groups.settings.messages.substitution_save_failed'));
    } finally {
      savingSub.value = false;
    }
  }

  async function deleteSub(id: string) {
    const isConfirmed = await confirmModal.ask({
      title: t('groups.settings.schedule.changes.delete_modal.title'),
      content: t('groups.settings.schedule.changes.delete_modal.message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!isConfirmed) return;

    try {
      await api.delete(groupPath(groupId, `/admin/schedule/subs/${id}`));
      subs.value = subs.value.filter((s) => s.id !== id);
      toast.success(t('groups.settings.messages.substitution_deleted'));
    } catch {
      toast.error(t('groups.settings.messages.substitution_delete_failed'));
    }
  }

  // Turning Dalton off deletes its lessons on the server, so the schedule
  // handed to the editor has to be fetched again.
  watch(activeGroupDaltonEnabled, () => void loadSchedule());

  onMounted(() => {
    void loadSchedule();
    void loadSubs();
  });

  return {
    lessons,
    loadingLessons,
    savingScheduleConfig,
    saveScheduleBatch,
    subs,
    loadingSubs,
    savingSub,
    loadSubs,
    saveSub,
    deleteSub,
  };
}
