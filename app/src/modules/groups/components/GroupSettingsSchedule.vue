<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import {
  RefreshCw,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  BookOpen,
  Undo2,
  Redo2,
} from '@lucide/vue';
import AdminSchedule from '@/modules/groups/components/AdminSchedule.vue';
import BaseMenu from '@/common/components/BaseMenu.vue';
import BaseMenuButton from '@/common/components/BaseMenuButton.vue';
import type { AdminCourse, AdminSubject } from '@/modules/groups/types';
import type { Lesson, ScheduleConfig } from '@/modules/schedule/types';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useGroupScheduleAdmin } from '@/modules/groups/composables/useGroupScheduleAdmin';
import { useLessonSelection } from '@/modules/groups/composables/useLessonSelection';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import { useI18n } from 'vue-i18n';
import {
  cloneFnJSON,
  useEventListener,
  useManualRefHistory,
  useWindowSize,
} from '@vueuse/core';
import { useIsMobileViewport } from '@/common/composables/useViewport';
import {
  findLessonSubject,
  lessonLastSlot,
} from '@/modules/schedule/utils/lesson';
import {
  DEFAULT_SCHEDULE_CONFIG,
  formatMinuteRange,
  slotRangeMinutes,
} from '@/modules/schedule/utils/slotTimes';
import { DALTON_SUBJECT_KEY } from '@/types/subjects';
import { courseLabel, subjectLabel } from '@/utils/subject-formatter';
import { haptic } from '@/utils/haptics';

const i18n = useI18n();
const { t, locale } = i18n;
const te = i18n.te.bind(i18n);
const { width: windowWidth } = useWindowSize();
const isMobile = useIsMobileViewport();

const {
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
} = useGroupScheduleAdmin();

const { activeGroupDaltonEnabled, checkPermission } = useAppAuth();
const { subjects, loadSubjects } = useSubjectAdmin();
const {
  days,
  scheduleConfig,
  schedulesCoursesIndividually,
  formatDayName,
  getDisplayName,
} = useScheduleDisplay();

const canEditScheduleConfig = computed(() => checkPermission('edit_schedule'));
const canManageScheduleChanges = computed(() =>
  checkPermission('manage_schedule_changes'),
);
// An Abitur group runs too many courses for one to be moved or given another
// subject, so its changes only cancel a lesson or send it to another room.
const canRescheduleLessons = computed(
  () => !schedulesCoursesIndividually.value,
);

const TOOLBAR_TRANSITION_MS = 300;
const MAX_UNDO_STEPS = 50;

let draftSequence = 0;
// Never a UUID, so the server stores a draft lesson as a new one.
const draftId = (prefix: string) => `${prefix}_${++draftSequence}`;

// ----------------------------------------------------
// Editor Mode & Draft Transaction State
// ----------------------------------------------------
const isEditMode = ref(false);
const showToolbar = ref(false);
const draftLessons = ref<Lesson[]>([]);
const hasSwitchedFromEditor = ref(false);
const mobileMenuOpen = ref(false);

const configFormOf = (config: ScheduleConfig) => ({
  startTime: config.startTime,
  totalSlots: config.totalSlots,
  lessonDurationMins: config.lessonDurationMins,
  breaks: Object.entries(config.breaks).map(([slot, duration]) => ({
    id: draftId('break'),
    slot: Number(slot),
    duration: Number(duration),
  })),
});

const draftConfigForm = ref(configFormOf(scheduleConfig.value));

/** The draft as the grid, the time labels and the save read it, with a blank duration read as the default. */
const draftConfig = computed<ScheduleConfig>(() => {
  const form = draftConfigForm.value;
  return {
    startTime: form.startTime,
    totalSlots: form.totalSlots,
    lessonDurationMins:
      Number(form.lessonDurationMins) ||
      DEFAULT_SCHEDULE_CONFIG.lessonDurationMins,
    breaks: Object.fromEntries(
      form.breaks
        .filter((brk) => brk.slot)
        .map((brk) => [brk.slot, Number(brk.duration || 0)]),
    ),
  };
});

const {
  selectedLessonIds,
  singleSelectedLesson,
  deselectAll,
  selectOnly,
  selectByClick,
  selectDay,
} = useLessonSelection(draftLessons);

const selectedDraftLessonIds = computed(() => new Set(selectedLessonIds.value));

function clearSelection() {
  deselectAll();
  mobileMenuOpen.value = false;
}

const draftHistory = useManualRefHistory(draftLessons, {
  clone: true,
  capacity: MAX_UNDO_STEPS,
  // The selection can name lessons the restored draft no longer has.
  setSource: (source, lessons) => {
    source.value = lessons;
    clearSelection();
  },
});
const { canUndo, canRedo, undo, redo } = draftHistory;

function enterEditMode() {
  if (!canEditScheduleConfig.value) return;
  hasSwitchedFromEditor.value = true;
  void loadSubjects();
  draftLessons.value = cloneFnJSON(lessons.value);
  draftConfigForm.value = configFormOf(scheduleConfig.value);
  clearSelection();
  draftHistory.commit();
  draftHistory.clear();
  showToolbar.value = false;
  isEditMode.value = true;
  void nextTick(() => {
    requestAnimationFrame(() => {
      showToolbar.value = true;
    });
  });
}

/** Lets the toolbar fold away before the editor gives way to the substitutions. */
function leaveEditMode() {
  showToolbar.value = false;
  setTimeout(() => {
    isEditMode.value = false;
    draftLessons.value = [];
    clearSelection();
  }, TOOLBAR_TRANSITION_MS);
}

async function handleSaveAll() {
  if (await saveScheduleBatch(draftLessons.value, draftConfig.value)) {
    leaveEditMode();
  }
}

// Config Breaks Logic for Draft
const sortedBreaks = computed(() => {
  return [...draftConfigForm.value.breaks].sort((a, b) => a.slot - b.slot);
});

function addBreak() {
  const takenSlots = new Set(draftConfigForm.value.breaks.map((b) => b.slot));
  for (let slot = 1; slot <= draftConfigForm.value.totalSlots; slot++) {
    if (!takenSlots.has(slot)) {
      draftConfigForm.value.breaks.push({
        id: draftId('break'),
        slot,
        duration: 10,
      });
      return;
    }
  }
}

function removeBreak(id: string) {
  draftConfigForm.value.breaks = draftConfigForm.value.breaks.filter(
    (b) => b.id !== id,
  );
}

// Substitution Form State
// A cleared number input hands `v-model.number` back an empty string.
const emptySubForm = () => ({
  lessonId: '',
  courseId: null as string | null,
  subject: '',
  room: '',
  slot: '' as number | '',
  duration: '' as number | '',
  day: null as number | null,
  cancelled: false,
});

const subForm = ref(emptySubForm());

const selectedLesson = ref<Lesson | null>(null);

const selectedLessonSubjectName = computed(() =>
  selectedLesson.value
    ? getDisplayName(selectedLesson.value) || t('common.selection.unknown')
    : '',
);

// The lesson's own day stands for "no change", so picking it again sends none.
const subDayOptions = computed(() =>
  days.map((day) =>
    day === selectedLesson.value?.day
      ? {
          label:
            t('groups.settings.schedule.changes.no_change') +
            ' (' +
            formatDayName(day) +
            ')',
          value: String(day),
        }
      : { label: formatDayName(day), value: String(day) },
  ),
);

const subDay = computed({
  get: () => String(subForm.value.day ?? selectedLesson.value?.day ?? ''),
  set: (value: string) => {
    const day = Number(value);
    subForm.value.day = day === selectedLesson.value?.day ? null : day;
  },
});

const hasSubChanges = computed(() => {
  const form = subForm.value;
  return (
    !!form.subject.trim() ||
    !!form.room.trim() ||
    form.slot !== '' ||
    form.duration !== '' ||
    form.day !== null ||
    form.cancelled
  );
});

const selectedLessonSubject = computed(() =>
  selectedLesson.value
    ? (findLessonSubject(selectedLesson.value, subjects.value) ?? null)
    : null,
);

// A course carries its own GK/LK/ZK type, so it goes into the label that tells
// two courses of the same subject apart.
function courseOptionLabel(course: AdminCourse): string {
  const typeKey = `groups.settings.subjects.course_types_short.${course.courseType}`;
  return course.courseType && te(typeKey)
    ? `${courseLabel(course.name, t, te)} (${t(typeKey)})`
    : courseLabel(course.name, t, te);
}

const courseOptionsOf = (subject: AdminSubject | null, placeholder: string) => [
  { label: placeholder, value: '' },
  ...(subject?.courses ?? []).map((course) => ({
    label: courseOptionLabel(course),
    value: course.id,
  })),
];

const targetCourseOptions = computed(() =>
  courseOptionsOf(
    selectedLessonSubject.value,
    t('groups.settings.schedule.changes.all_subject_courses'),
  ),
);

function getSubCourseName(courseId?: string | null): string {
  if (!courseId) return t('groups.settings.schedule.changes.all_courses');
  for (const s of subjects.value) {
    const c = s.courses?.find((course) => course.id === courseId);
    if (c) return courseLabel(c.name, t, te);
  }
  return t('groups.settings.schedule.changes.specific_course');
}

function openSubModal(lesson: Lesson) {
  if (!canManageScheduleChanges.value) return;
  selectedLesson.value = lesson;
  subForm.value = {
    ...emptySubForm(),
    lessonId: lesson._originalId || lesson.id,
    courseId: lesson.courseId || null,
  };
}

function toggleSubCancelled() {
  subForm.value.cancelled = !subForm.value.cancelled;
  haptic();
}

function closeSubModal() {
  selectedLesson.value = null;
}

/** What the folded-away fields hold stays out of a cancellation. */
function lessonChangesPayload(): Record<string, unknown> {
  const form = subForm.value;
  if (form.cancelled) return { cancelled: true };

  const payload: Record<string, unknown> = {};
  const subject = form.subject.trim();
  const room = form.room.trim();
  if (subject) payload.subject = subject;
  if (room) payload.room = room;
  if (form.slot !== '') payload.slot = form.slot;
  if (form.duration !== '') payload.duration = form.duration;
  if (form.day !== null) payload.day = form.day;
  return payload;
}

async function handleSaveSub() {
  const payload: Record<string, unknown> = {
    lessonId: subForm.value.lessonId,
    ...lessonChangesPayload(),
  };
  if (subForm.value.courseId) payload.courseId = subForm.value.courseId;

  if (await saveSub(payload)) closeSubModal();
}

// ----------------------------------------------------
// Lesson Selection & Context Menu Action State
// ----------------------------------------------------

// Native contextmenu handling (Hold on Mobile / Right-click on Desktop)
function handleContextMenu(lesson: Lesson, event?: UIEvent) {
  event?.preventDefault();
  selectOnly(lesson.id);
  mobileMenuOpen.value = true;
}

function handleLessonClick(lesson: Lesson, event?: MouseEvent) {
  // On Mobile: Tapping an existing lesson directly opens edit modal
  if (isMobile.value || !event) {
    openEditLessonModal(lesson);
    return;
  }
  selectByClick(lesson.id, event);
}

function handleAddLessonFromSelection() {
  const lesson = singleSelectedLesson.value;
  if (!lesson) return;
  mobileMenuOpen.value = false;
  openAddLessonModal(lesson.day, lesson.slot);
}

function handleEditLessonFromSelection() {
  const lesson = singleSelectedLesson.value;
  if (!lesson) return;
  mobileMenuOpen.value = false;
  openEditLessonModal(lesson);
}

function handleDeleteSelection() {
  if (selectedLessonIds.value.length === 0) return;
  const toDelete = new Set(selectedLessonIds.value);
  draftLessons.value = draftLessons.value.filter((l) => !toDelete.has(l.id));
  clearSelection();
  draftHistory.commit();
}

function handleWindowKeyDown(e: KeyboardEvent) {
  if (!isEditMode.value) return;
  const activeEl = document.activeElement;
  if (
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      isLessonModalOpen.value)
  ) {
    return;
  }

  const isCtrlCmd = e.ctrlKey || e.metaKey;
  if (isCtrlCmd && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  if (isCtrlCmd && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    return;
  }

  if (e.key === 'Escape') {
    if (selectedLessonIds.value.length > 0) {
      clearSelection();
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedLessonIds.value.length > 0) {
      handleDeleteSelection();
    }
  }
}

function handleGlobalClick(e: MouseEvent) {
  if (
    !isEditMode.value ||
    selectedLessonIds.value.length === 0 ||
    isLessonModalOpen.value
  ) {
    return;
  }
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const isLessonCard = !!target.closest('.js-lesson-card');
  const isInteractive = !!target.closest(
    'button, a, input, select, textarea, [role="button"], label, [role="dialog"]',
  );

  if (!isLessonCard && !isInteractive) {
    clearSelection();
  }
}

useEventListener('keydown', handleWindowKeyDown);
useEventListener('click', handleGlobalClick);

// ----------------------------------------------------
// Lesson Edit / Add Modal (Relational Schema Best Practices)
// ----------------------------------------------------
const isLessonModalOpen = ref(false);
const lessonForm = ref({
  id: '',
  day: 1,
  slot: 1,
  duration: 1,
  room: '',
  subjectId: '',
  courseId: '',
});

// Dalton has no subject row, so the form tells it apart by a value no subject
// id can take.
const DALTON_LESSON_OPTION = '__dalton__';

const isDaltonSelected = computed(
  () => lessonForm.value.subjectId === DALTON_LESSON_OPTION,
);

// Subject Options directly from group subjects table, plus the Dalton
// pseudo-subject while the group has it enabled.
const subjectOptions = computed(() => {
  const options = subjects.value.map((s) => ({
    label: subjectLabel(s.name, t, te),
    value: s.id,
  }));
  if (activeGroupDaltonEnabled.value) {
    options.push({
      label: t(`common.subjects.${DALTON_SUBJECT_KEY}`),
      value: DALTON_LESSON_OPTION,
    });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, locale.value));
});

// Selected Subject Object
const selectedSubjectObj = computed(() => {
  if (!lessonForm.value.subjectId || isDaltonSelected.value) return null;
  return (
    subjects.value.find((s) => s.id === lessonForm.value.subjectId) || null
  );
});

const lessonCourseOptions = computed(() =>
  courseOptionsOf(
    selectedSubjectObj.value,
    t('groups.settings.schedule.editor.select_course_prompt'),
  ),
);

// The course field stays visible for a lesson that still carries one after the
// group switched back to regular, so it can be cleared there too.
const showLessonCourseField = computed(
  () =>
    (schedulesCoursesIndividually.value || !!lessonForm.value.courseId) &&
    (selectedSubjectObj.value?.courses?.length ?? 0) > 0,
);

// A course of another subject cannot stay selected when the subject changes.
watch(
  () => lessonForm.value.subjectId,
  () => {
    const courses = selectedSubjectObj.value?.courses ?? [];
    if (!courses.some((c) => c.id === lessonForm.value.courseId)) {
      lessonForm.value.courseId = '';
    }
  },
);

// Summary text for selected day & slot at top of modal
const selectedSlotSummary = computed(() => {
  const { day, slot } = lessonForm.value;
  const lastSlot = lessonLastSlot(lessonForm.value);
  const periods =
    slot === lastSlot
      ? t('schedule.period', { slot })
      : t('schedule.periods', { first: slot, last: lastSlot });
  const time = formatMinuteRange(
    slotRangeMinutes(draftConfig.value, slot, lastSlot),
  );
  return `${formatDayName(day)}, ${periods} (${time})`;
});

const editingLessonRef = ref<Lesson | null>(null);

// An edited lesson opened before the subjects arrived gets its subject once they do.
watch(subjects, (loadedSubjects) => {
  const lesson = editingLessonRef.value;
  if (!isLessonModalOpen.value || !lesson || lessonForm.value.subjectId) {
    return;
  }
  lessonForm.value.subjectId =
    findLessonSubject(lesson, loadedSubjects)?.id ?? '';
});

function openAddLessonModal(day: number, slot: number) {
  editingLessonRef.value = null;
  if (!subjects.value || subjects.value.length === 0) {
    void loadSubjects();
  }
  lessonForm.value = {
    id: '',
    day: Number(day),
    slot: Number(slot),
    duration: 1,
    room: '',
    subjectId: '',
    courseId: '',
  };
  isLessonModalOpen.value = true;
}

function openEditLessonModal(lesson: Lesson) {
  if (!lesson) return;
  editingLessonRef.value = lesson;
  if (!subjects.value || subjects.value.length === 0) {
    void loadSubjects();
  }

  const matchedSub = findLessonSubject(lesson, subjects.value);

  const matchedSubId = lesson.isDalton
    ? DALTON_LESSON_OPTION
    : (matchedSub?.id ?? '');

  const lessonCourseId = lesson.courseId || lesson.courses?.id || '';
  const matchedCourseId = matchedSub?.courses?.some(
    (c) => c.id === lessonCourseId,
  )
    ? lessonCourseId
    : '';

  lessonForm.value = {
    id: lesson.id,
    day: Number(lesson.day),
    slot: Number(lesson.slot),
    duration: Number(lesson.duration || 1),
    room: lesson.room || '',
    subjectId: matchedSubId,
    courseId: matchedCourseId,
  };
  isLessonModalOpen.value = true;
}

function closeLessonModal() {
  isLessonModalOpen.value = false;
  editingLessonRef.value = null;
}

function submitLessonForm() {
  const targetId = lessonForm.value.id || draftId('les_draft');

  const newLesson = isDaltonSelected.value
    ? draftDaltonLesson(targetId)
    : draftSubjectLesson(targetId);
  if (!newLesson) return;

  const existingIdx = draftLessons.value.findIndex((l) => l.id === targetId);
  if (existingIdx !== -1) {
    draftLessons.value[existingIdx] = newLesson;
  } else {
    draftLessons.value.push(newLesson);
  }

  draftHistory.commit();
  closeLessonModal();
}

/** Where and in which room the form places a lesson, whatever it teaches. */
function draftLessonPlacement(id: string) {
  const form = lessonForm.value;
  return {
    id,
    day: Number(form.day),
    slot: Number(form.slot),
    duration: Number(form.duration || 1),
    room: form.room.trim() || null,
  };
}

function draftDaltonLesson(id: string): Lesson {
  return {
    ...draftLessonPlacement(id),
    subjectId: null,
    subjects: null,
    courseId: null,
    courses: null,
    isDalton: true,
  };
}

function draftSubjectLesson(id: string): Lesson | null {
  const subObj = selectedSubjectObj.value;
  if (!subObj) return null;

  const courseObj =
    subObj.courses?.find((c) => c.id === lessonForm.value.courseId) ?? null;

  return {
    ...draftLessonPlacement(id),
    subjectId: subObj.id,
    subject: subObj.name,
    subjectAbbr: subObj.name.substring(0, 3).toUpperCase(),
    subjects: { id: subObj.id, name: subObj.name },
    courseId: courseObj?.id ?? null,
    courseName: courseObj?.name,
    courses: courseObj ? { id: courseObj.id, name: courseObj.name } : null,
  };
}

onMounted(() => {
  void loadSubjects();
});
</script>

<template>
  <div>
    <PageHeader>
      <span class="swap-stack">
        <Transition :name="isEditMode ? 'swap-wheel-down' : 'swap-wheel-up'">
          <span v-if="isEditMode" class="swap-text">
            {{ t('groups.settings.schedule.editor.title') }}
          </span>
          <span v-else class="swap-text">
            {{ t('groups.settings.schedule.changes.title') }}
          </span>
        </Transition>
      </span>

      <template #info>
        <InfoModal
          :tooltip="t('groups.settings.schedule.info.tooltip')"
          :title="t('groups.settings.schedule.info.title')"
        >
          <h3>
            {{ t('groups.settings.schedule.config.instruction_text') }}
          </h3>
        </InfoModal>
      </template>

      <template #action>
        <div class="swap-stack justify-items-end">
          <Transition name="swap-icon">
            <div v-if="!isEditMode" class="flex items-center gap-2">
              <BaseTooltip :content="t('common.buttons.refresh')">
                <BaseButton
                  :disabled="loadingLessons || loadingSubs"
                  variant="ghost"
                  :icon="RefreshCw"
                  @click="loadSubs"
                />
              </BaseTooltip>

              <BaseTooltip
                v-if="canEditScheduleConfig"
                :content="
                  t('groups.settings.schedule.editor.edit_schedule_button')
                "
                placement="bottom"
              >
                <BaseButton
                  variant="ghost"
                  :icon="Pencil"
                  @click="enterEditMode"
                />
              </BaseTooltip>
            </div>

            <div v-else class="flex items-center gap-2">
              <BaseButton
                v-if="windowWidth <= 768"
                variant="ghost"
                :icon="X"
                @click="leaveEditMode"
              />
              <BaseButton
                v-else
                variant="ghost"
                :icon="X"
                @click="leaveEditMode"
              >
                {{ t('groups.settings.schedule.editor.cancel_button') }}
              </BaseButton>

              <BaseButton
                v-if="windowWidth <= 768"
                variant="action"
                :icon="Check"
                :disabled="savingScheduleConfig"
                @click="handleSaveAll"
              />
              <BaseButton
                v-else
                variant="action"
                :icon="Check"
                :disabled="savingScheduleConfig"
                @click="handleSaveAll"
              >
                {{
                  savingScheduleConfig
                    ? t('common.buttons.saving')
                    : t('groups.settings.schedule.editor.save_all_button')
                }}
              </BaseButton>
            </div>
          </Transition>
        </div>
      </template>
    </PageHeader>

    <div v-if="isEditMode" class="flex flex-col gap-6">
      <div class="sm:p-6">
        <div
          class="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
          :class="
            showToolbar
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          "
        >
          <div class="overflow-hidden min-h-0">
            <div class="pb-4">
              <div
                class="flex flex-wrap items-center justify-between gap-2 sm:p-1 sm:rounded-2xl sm:border border-ghost-border sm:bg-surface sm:shadow-input"
              >
                <div class="flex items-center gap-2">
                  <BaseTooltip
                    :content="t('groups.settings.schedule.editor.undo')"
                    placement="bottom"
                  >
                    <BaseButton
                      variant="ghost"
                      :icon="Undo2"
                      :disabled="!canUndo"
                      @click="undo"
                    />
                  </BaseTooltip>

                  <BaseTooltip
                    :content="t('groups.settings.schedule.editor.redo')"
                    placement="bottom"
                  >
                    <BaseButton
                      variant="ghost"
                      :icon="Redo2"
                      :disabled="!canRedo"
                      @click="redo"
                    />
                  </BaseTooltip>

                  <div
                    class="hidden sm:block h-4 w-px bg-ghost-border mx-1"
                  ></div>

                  <span
                    class="hidden sm:inline-block text-sm font-semibold text-on-ghost"
                    >{{
                      t('groups.settings.schedule.changes.selected_count', {
                        count: selectedLessonIds.length,
                      })
                    }}
                  </span>
                </div>

                <div class="hidden sm:flex flex-wrap items-center gap-2">
                  <BaseButton
                    variant="ghost"
                    :icon="Plus"
                    :disabled="!singleSelectedLesson"
                    @click="handleAddLessonFromSelection"
                  >
                    {{ t('groups.settings.schedule.editor.add_lesson_slot') }}
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    :icon="Pencil"
                    :disabled="!singleSelectedLesson"
                    @click="handleEditLessonFromSelection"
                  >
                    {{ t('groups.settings.schedule.editor.edit_lesson_title') }}
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    :icon="Trash2"
                    :disabled="selectedLessonIds.length === 0"
                    @click="handleDeleteSelection"
                  >
                    {{
                      t('groups.settings.schedule.editor.delete_lesson_button')
                    }}
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AdminSchedule
          :lessons="draftLessons"
          :subjects="subjects"
          is-editable
          :individual-courses="schedulesCoursesIndividually"
          :selected-lesson-ids="selectedDraftLessonIds"
          :config="draftConfig"
          :animated="false"
          @select-lesson="handleLessonClick"
          @select-day="selectDay"
          @add-lesson="({ day, slot }) => openAddLessonModal(day, slot)"
          @contextmenu-lesson="handleContextMenu"
        />
      </div>

      <div class="sm:p-6">
        <h3
          class="mt-0 mb-4 text-base font-semibold text-on-ghost flex items-center gap-2"
        >
          {{ t('groups.settings.schedule.editor.plan_config_title') }}
        </h3>

        <div class="flex flex-col gap-4 mb-4">
          <div>
            <BaseLabel for="config-start">{{
              t('groups.settings.schedule.config.start_time_label')
            }}</BaseLabel>
            <BaseInput
              id="config-start"
              v-model="draftConfigForm.startTime"
              type="time"
            />
          </div>
          <div>
            <BaseLabel for="config-slots">{{
              t('groups.settings.schedule.config.slots_per_day_label')
            }}</BaseLabel>
            <BaseInput
              id="config-slots"
              v-model.number="draftConfigForm.totalSlots"
              type="number"
              min="1"
              max="15"
            />
          </div>
          <div>
            <BaseLabel for="config-duration">{{
              t('groups.settings.schedule.config.lesson_duration_label')
            }}</BaseLabel>
            <BaseInput
              id="config-duration"
              v-model.number="draftConfigForm.lessonDurationMins"
              type="number"
              min="10"
              max="120"
            />
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-ghost-border">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-on-ghost">{{
              t('groups.settings.schedule.config.breaks_title')
            }}</span>
            <BaseButton variant="ghost" :icon="Plus" @click="addBreak">
              {{ t('groups.settings.schedule.config.add_break_button') }}
            </BaseButton>
          </div>

          <div
            v-if="draftConfigForm.breaks.length === 0"
            class="text-center py-2 text-on-ghost-muted text-xs italic"
          >
            {{ t('groups.settings.schedule.config.no_breaks') }}
          </div>

          <div class="flex flex-col gap-2">
            <div
              v-for="brk in sortedBreaks"
              :key="brk.id"
              class="flex gap-2 items-end"
            >
              <div class="form-field flex-1 m-0">
                <BaseLabel :for="`break-slot-${brk.id}`" class="text-xs">{{
                  t('groups.settings.schedule.config.after_lesson_label')
                }}</BaseLabel>
                <BaseInput
                  :id="`break-slot-${brk.id}`"
                  v-model.number="brk.slot"
                  type="number"
                  min="1"
                  :max="draftConfigForm.totalSlots"
                />
              </div>
              <div class="form-field flex-1 m-0">
                <BaseLabel :for="`break-dur-${brk.id}`" class="text-xs">{{
                  t('groups.settings.schedule.config.break_duration_label')
                }}</BaseLabel>
                <BaseInput
                  :id="`break-dur-${brk.id}`"
                  v-model.number="brk.duration"
                  type="number"
                  min="1"
                />
              </div>
              <BaseButton
                variant="ghost"
                class="text-danger mb-1"
                :icon="Trash2"
                @click="removeBreak(brk.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <BaseRow stack-on-mobile justify="end">
        <BaseButton form variant="ghost" @click="leaveEditMode">
          {{ t('groups.settings.schedule.editor.cancel_button') }}
        </BaseButton>
        <BaseButton
          form
          variant="action"
          :disabled="savingScheduleConfig"
          @click="handleSaveAll"
        >
          {{
            savingScheduleConfig
              ? t('common.buttons.saving')
              : t('groups.settings.schedule.editor.save_all_button')
          }}
        </BaseButton>
      </BaseRow>
    </div>

    <div v-else class="flex flex-col gap-6">
      <div class="sm:p-6">
        <div
          v-if="loadingLessons"
          class="text-center p-8 text-on-ghost-muted text-base"
        >
          {{ t('schedule.loading') }}
        </div>
        <AdminSchedule
          v-else
          :lessons="lessons"
          :subjects="subjects"
          :individual-courses="schedulesCoursesIndividually"
          :animated="!hasSwitchedFromEditor"
          @select-lesson="openSubModal"
        />
      </div>

      <div class="sm:p-6">
        <h3>{{ t('groups.settings.schedule.changes.list_title') }}</h3>

        <div
          v-if="subs.length === 0 && !loadingSubs"
          class="text-center p-8 text-on-ghost-muted text-base"
        >
          {{ t('groups.settings.schedule.changes.no_changes') }}
        </div>
        <BaseTableWrapper v-else>
          <table>
            <thead>
              <tr>
                <th v-if="canRescheduleLessons">
                  {{ t('groups.settings.schedule.changes.table.subject') }}
                </th>
                <th>
                  {{ t('groups.settings.schedule.changes.table.course') }}
                </th>
                <th>{{ t('groups.settings.schedule.changes.table.room') }}</th>
                <template v-if="canRescheduleLessons">
                  <th>
                    {{ t('groups.settings.schedule.changes.table.day') }}
                  </th>
                  <th>
                    {{ t('groups.settings.schedule.changes.table.slot') }}
                  </th>
                </template>
                <th>
                  {{ t('groups.settings.schedule.changes.cancelled_label') }}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in subs" :key="sub.id">
                <td v-if="canRescheduleLessons">
                  {{
                    sub.subject
                      ? subjectLabel(sub.subject, t, te)
                      : t('common.selection.unknown')
                  }}
                </td>
                <td>{{ getSubCourseName(sub.courseId) }}</td>
                <td>{{ sub.room }}</td>
                <template v-if="canRescheduleLessons">
                  <td>{{ sub.day || '-' }}</td>
                  <td>{{ sub.slot || '-' }}</td>
                </template>
                <td class="text-danger">
                  {{
                    sub.cancelled
                      ? t('groups.settings.schedule.changes.cancelled_label')
                      : '-'
                  }}
                </td>
                <td class="py-0! px-2! min-w-0!">
                  <BaseTooltip
                    :content="t('common.buttons.delete')"
                    placement="bottom"
                  >
                    <BaseButton
                      :disabled="!canManageScheduleChanges"
                      variant="ghost"
                      size="sm"
                      :icon="Trash2"
                      @click="deleteSub(sub.id)"
                    />
                  </BaseTooltip>
                </td>
              </tr>
            </tbody>
          </table>
        </BaseTableWrapper>
      </div>
    </div>

    <BaseModal
      :open="isLessonModalOpen"
      :submit="submitLessonForm"
      :requirement="!!lessonForm.subjectId"
      header-actions
      @cancel="closeLessonModal"
    >
      <template #title>
        {{
          lessonForm.id
            ? t('groups.settings.schedule.editor.edit_lesson_title')
            : t('groups.settings.schedule.editor.add_lesson_title')
        }}
      </template>

      <template #content>
        <div class="text-base text-on-ghost-muted">
          {{ selectedSlotSummary }}
        </div>

        <div
          v-if="subjectOptions.length === 0"
          class="text-xs text-warning bg-warning/10 border border-warning/20 p-3 rounded-lg flex items-center gap-2"
        >
          <BookOpen class="size-4 shrink-0" />
          <span>
            {{ t('groups.settings.schedule.editor.no_subjects') }}
          </span>
        </div>

        <template v-else>
          <BaseFormGroup id="lesson-subject">
            <BaseLabel for="lesson-subject-select" required>{{
              t('groups.settings.schedule.editor.subject_label')
            }}</BaseLabel>
            <BaseSelect
              id="lesson-subject-select"
              v-model="lessonForm.subjectId"
              :options="subjectOptions"
              classes="w-full"
            />
          </BaseFormGroup>

          <BaseFormGroup v-if="showLessonCourseField" id="lesson-course">
            <BaseLabel for="lesson-course-select">{{
              t('groups.settings.schedule.editor.course_label')
            }}</BaseLabel>
            <BaseSelect
              id="lesson-course-select"
              v-model="lessonForm.courseId"
              :options="lessonCourseOptions"
              classes="w-full"
            />
            <span class="text-xs text-on-ghost-muted mt-1">
              {{ t('groups.settings.schedule.editor.course_hint') }}
            </span>
          </BaseFormGroup>

          <BaseFormGroup id="lesson-room">
            <BaseLabel for="lesson-room-input">{{
              t('groups.settings.schedule.editor.room_label')
            }}</BaseLabel>
            <BaseInput
              id="lesson-room-input"
              v-model="lessonForm.room"
              :placeholder="
                t('groups.settings.schedule.editor.room_placeholder')
              "
            />
          </BaseFormGroup>

          <BaseFormGroup id="lesson-dur">
            <BaseLabel for="lesson-dur-input" required>{{
              t('groups.settings.schedule.editor.duration_label')
            }}</BaseLabel>
            <BaseInput
              id="lesson-dur-input"
              v-model.number="lessonForm.duration"
              type="number"
              min="1"
              max="6"
            />
          </BaseFormGroup>
        </template>
      </template>

      <template #action-text>
        {{ t('groups.settings.schedule.editor.save_lesson_button') }}
      </template>
    </BaseModal>

    <BaseModal
      :open="!!selectedLesson"
      :submit="handleSaveSub"
      :loading="savingSub"
      :requirement="hasSubChanges"
      header-actions
      @cancel="closeSubModal"
    >
      <template #title>
        {{ t('groups.settings.schedule.changes.edit_lesson_title') }}
      </template>

      <template #content>
        <i18n-t
          :keypath="
            selectedLesson?.room
              ? 'groups.settings.schedule.changes.editing_summary'
              : 'groups.settings.schedule.changes.editing_summary_no_room'
          "
          tag="div"
          class="text-base text-on-ghost-muted"
        >
          <template #subject>
            <strong>{{ selectedLessonSubjectName }}</strong>
          </template>
          <template #room>
            <strong>{{ selectedLesson?.room }}</strong>
          </template>
          <template #day>
            {{ selectedLesson ? formatDayName(selectedLesson.day) : '' }}
          </template>
        </i18n-t>

        <button
          type="button"
          role="switch"
          :aria-checked="subForm.cancelled"
          class="relative group flex items-center justify-between w-full h-10 cursor-pointer touch-target after:min-h-12"
          @click="toggleSubCancelled"
        >
          <span class="text-base font-normal">{{
            t('groups.settings.schedule.changes.cancelled_label')
          }}</span>
          <BaseToggle :model-value="subForm.cancelled" decorative />
        </button>

        <BaseFormGroup
          v-if="
            !selectedLesson?.courseId && selectedLessonSubject?.courses?.length
          "
          id="sub-course"
        >
          <BaseLabel for="sub-course-select">{{
            t('groups.settings.schedule.changes.affected_course_label')
          }}</BaseLabel>
          <BaseSelect
            id="sub-course-select"
            v-model="subForm.courseId"
            :options="targetCourseOptions"
            classes="w-full"
          />
        </BaseFormGroup>

        <!-- A cancelled lesson shows nothing else, so its other changes fold
             away; they keep what was typed in case it is turned off again.
             The negative margin takes back the form's gap while collapsed. -->
        <div
          class="grid -mt-4 transition-[grid-template-rows,opacity] duration-300 ease-out"
          :class="
            subForm.cancelled
              ? 'grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100'
          "
          :inert="subForm.cancelled"
        >
          <div class="overflow-hidden min-h-0">
            <div class="flex flex-col gap-4 pt-4">
              <BaseFormGroup v-if="canRescheduleLessons" id="sub-subject">
                <BaseLabel for="sub-subject-input">{{
                  t('groups.settings.schedule.changes.new_subject_label')
                }}</BaseLabel>
                <BaseInput id="sub-subject-input" v-model="subForm.subject" />
              </BaseFormGroup>

              <BaseFormGroup id="sub-room">
                <BaseLabel for="sub-room-input">{{
                  t('groups.settings.schedule.changes.new_room_label')
                }}</BaseLabel>
                <BaseInput id="sub-room-input" v-model="subForm.room" />
              </BaseFormGroup>

              <template v-if="canRescheduleLessons">
                <BaseFormGroup id="sub-slot">
                  <BaseLabel for="sub-slot-input">{{
                    t('groups.settings.schedule.changes.new_slot_label')
                  }}</BaseLabel>
                  <BaseInput
                    id="sub-slot-input"
                    v-model.number="subForm.slot"
                    type="number"
                    min="1"
                    :placeholder="String(selectedLesson?.slot ?? '')"
                  />
                </BaseFormGroup>

                <BaseFormGroup id="sub-duration">
                  <BaseLabel for="sub-duration-input">{{
                    t('groups.settings.schedule.changes.new_duration_label')
                  }}</BaseLabel>
                  <BaseInput
                    id="sub-duration-input"
                    v-model.number="subForm.duration"
                    type="number"
                    min="1"
                    :placeholder="String(selectedLesson?.duration ?? 1)"
                  />
                </BaseFormGroup>

                <BaseFormGroup id="sub-day">
                  <BaseLabel for="sub-day-select">{{
                    t('groups.settings.schedule.changes.new_day_label')
                  }}</BaseLabel>
                  <BaseSelect
                    id="sub-day-select"
                    v-model="subDay"
                    :options="subDayOptions"
                    classes="w-full"
                  />
                </BaseFormGroup>
              </template>
            </div>
          </div>
        </div>
      </template>

      <template #action-text>
        {{ t('common.buttons.save') }}
      </template>
    </BaseModal>

    <BaseMenu
      v-if="isEditMode"
      :open="mobileMenuOpen"
      @close="mobileMenuOpen = false"
      @cancel="mobileMenuOpen = false"
    >
      <BaseMenuButton
        :icon="Plus"
        :disabled="!singleSelectedLesson"
        @click="handleAddLessonFromSelection"
      >
        {{ t('groups.settings.schedule.editor.add_lesson_slot') }}
      </BaseMenuButton>
      <BaseMenuButton
        :icon="Pencil"
        :disabled="!singleSelectedLesson"
        @click="handleEditLessonFromSelection"
      >
        {{ t('groups.settings.schedule.editor.edit_lesson_title') }}
      </BaseMenuButton>
      <BaseMenuButton
        variant="danger"
        :icon="Trash2"
        :disabled="selectedLessonIds.length === 0"
        @click="handleDeleteSelection"
      >
        {{ t('groups.settings.schedule.editor.delete_lesson_button') }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
</template>
