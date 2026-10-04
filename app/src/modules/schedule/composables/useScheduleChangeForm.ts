import { ref, computed, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { groupPath } from '@/api/groupPath';
import { useToast } from '@/common/composables/useToast';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import type { Lesson } from '@/modules/schedule/types';
import { findLessonSubject } from '@/modules/schedule/utils/lesson';
import { courseOptionLabel } from '@/utils/subject-formatter';
import { haptic } from '@/utils/haptics';

interface ScheduleChangePayload {
  lessonId: string;
  courseId?: string;
  cancelled?: true;
  subject?: string;
  room?: string;
  slot?: number;
  duration?: number;
  day?: number;
}

// A cleared number input hands `v-model.number` back an empty string.
const emptyChangeForm = () => ({
  courseId: '',
  subject: '',
  room: '',
  slot: '' as number | '',
  duration: '' as number | '',
  day: null as number | null,
  cancelled: false,
});

/** The change an admin enters for one lesson of the group's weekly schedule. */
export function useScheduleChangeForm(lesson: Ref<Lesson | null>) {
  const i18n = useI18n();
  const { t } = i18n;
  const te = i18n.te.bind(i18n);
  const toast = useToast();
  const groupId = useGroupPageId();
  const { subjects, loadSubjects } = useSubjectAdmin();
  const { days, schedulesCoursesIndividually, formatDayName, getDisplayName } =
    useScheduleDisplay();

  const form = ref(emptyChangeForm());
  const saving = ref(false);

  // An Abitur group runs too many courses for one to be moved or given another
  // subject, so its changes only cancel a lesson or send it to another room.
  const canRescheduleLessons = computed(
    () => !schedulesCoursesIndividually.value,
  );

  watch(
    lesson,
    (opened) => {
      if (!opened) return;
      form.value = { ...emptyChangeForm(), courseId: opened.courseId ?? '' };
      if (subjects.value.length === 0) void loadSubjects();
    },
    { immediate: true },
  );

  const lessonSubjectName = computed(() =>
    lesson.value
      ? getDisplayName(lesson.value) || t('common.selection.unknown')
      : '',
  );

  const lessonSubject = computed(() =>
    lesson.value ? findLessonSubject(lesson.value, subjects.value) : undefined,
  );

  // Only a lesson standing for every course of its subject can narrow the
  // change down to one of them.
  const courseOptions = computed(() =>
    lesson.value?.courseId
      ? []
      : [
          {
            label: t('groups.settings.schedule.changes.all_subject_courses'),
            value: '',
          },
          ...(lessonSubject.value?.courses ?? []).map((course) => ({
            label: courseOptionLabel(course, t, te),
            value: course.id,
          })),
        ],
  );

  // The lesson's own day stands for "no change", so picking it again sends none.
  const dayOptions = computed(() =>
    days.map((day) =>
      day === lesson.value?.day
        ? {
            label: `${t('groups.settings.schedule.changes.no_change')} (${formatDayName(day)})`,
            value: String(day),
          }
        : { label: formatDayName(day), value: String(day) },
    ),
  );

  const day = computed({
    get: () => String(form.value.day ?? lesson.value?.day ?? ''),
    set: (value: string) => {
      const picked = Number(value);
      form.value.day = picked === lesson.value?.day ? null : picked;
    },
  });

  const hasChanges = computed(() => {
    const { subject, room, slot, duration, day, cancelled } = form.value;
    return (
      !!subject.trim() ||
      !!room.trim() ||
      slot !== '' ||
      duration !== '' ||
      day !== null ||
      cancelled
    );
  });

  function toggleCancelled() {
    form.value.cancelled = !form.value.cancelled;
    haptic();
  }

  /** What the folded-away fields hold stays out of a cancellation. */
  function changesPayload(): Omit<ScheduleChangePayload, 'lessonId'> {
    const { courseId, cancelled, subject, room, slot, duration, day } =
      form.value;
    const course = courseId ? { courseId } : {};
    if (cancelled) return { ...course, cancelled: true };
    return {
      ...course,
      ...(subject.trim() ? { subject: subject.trim() } : {}),
      ...(room.trim() ? { room: room.trim() } : {}),
      ...(slot !== '' ? { slot } : {}),
      ...(duration !== '' ? { duration } : {}),
      ...(day !== null ? { day } : {}),
    };
  }

  async function saveChange(): Promise<boolean> {
    const target = lesson.value;
    if (!target) return false;
    const payload: ScheduleChangePayload = {
      lessonId: target._originalId || target.id,
      ...changesPayload(),
    };

    saving.value = true;
    try {
      await api.post(groupPath(groupId, '/admin/schedule/subs'), payload);
      toast.success(t('groups.settings.messages.substitution_saved'));
      return true;
    } catch {
      toast.error(t('groups.settings.messages.substitution_save_failed'));
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    form,
    saving,
    canRescheduleLessons,
    lessonSubjectName,
    courseOptions,
    dayOptions,
    day,
    hasChanges,
    toggleCancelled,
    saveChange,
    formatDayName,
  };
}
