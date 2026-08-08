<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  RefreshCw,
  Trash2,
  Plus,
  Pencil,
  Check,
  Clock,
  Calendar,
  X,
  BookOpen,
} from '@lucide/vue';
import AdminSchedule from '@/modules/groups/components/AdminSchedule.vue';
import type { ScheduleSubstitution } from '@/modules/groups/types';
import type { Lesson } from '@/modules/schedule/types';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  subs: ScheduleSubstitution[];
  loadingSubs: boolean;
  lessons: Lesson[];
  loadingLessons: boolean;
  savingSub: boolean;
  savingScheduleConfig: boolean;
  savingLesson?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'save-sub', payload: Record<string, unknown>): void;
  (e: 'delete-sub', id: string): void;
  (e: 'update-schedule-config', payload: Record<string, any>): void;
  (
    e: 'save-schedule-batch',
    updatedLessons: Lesson[],
    configPayload?: Record<string, any>,
  ): void;
  (e: 'save-lesson', payload: Record<string, unknown>): void;
  (e: 'delete-lesson', id: string): void;
}>();

const { activeScheduleConfig, checkPermission } = useAppAuth();
const { subjects, loadSubjects } = useSubjectAdmin();

const canEditScheduleConfig = computed(() => checkPermission('edit_schedule'));
const canManageScheduleChanges = computed(() =>
  checkPermission('manage_schedule_changes'),
);

// ----------------------------------------------------
// Editor Mode & Draft Transaction State
// ----------------------------------------------------
const isEditMode = ref(false);
const draftLessons = ref<Lesson[]>([]);

const configForm = ref({
  startTime: '08:00',
  totalSlots: 9,
  lessonDurationMins: 45,
  breaks: [] as { id: string; slot: number; duration: number }[],
});

const draftConfigForm = ref({
  startTime: '08:00',
  totalSlots: 9,
  lessonDurationMins: 45,
  breaks: [] as { id: string; slot: number; duration: number }[],
});

watch(
  activeScheduleConfig,
  (newConfig) => {
    if (newConfig) {
      const cfg = {
        startTime: newConfig.startTime ?? '08:00',
        totalSlots: newConfig.totalSlots ?? 9,
        lessonDurationMins: newConfig.lessonDurationMins ?? 45,
        breaks: Object.entries(newConfig.breaks || {}).map(
          ([slot, duration]) => ({
            id: Math.random().toString(36).substring(2, 9),
            slot: Number(slot),
            duration: Number(duration),
          }),
        ),
      };
      configForm.value = cfg;
      if (!isEditMode.value) {
        draftConfigForm.value = JSON.parse(JSON.stringify(cfg));
      }
    }
  },
  { immediate: true, deep: true },
);

function enterEditMode() {
  if (!canEditScheduleConfig.value) return;
  void loadSubjects();
  draftLessons.value = JSON.parse(JSON.stringify(props.lessons));
  draftConfigForm.value = JSON.parse(JSON.stringify(configForm.value));
  isEditMode.value = true;
}

function cancelEditMode() {
  isEditMode.value = false;
  draftLessons.value = [];
}

function handleSaveAll() {
  const breaksObj: Record<number, number> = {};
  draftConfigForm.value.breaks.forEach((b) => {
    if (b.slot) {
      breaksObj[b.slot] = b.duration || 0;
    }
  });

  const configPayload = {
    startTime: draftConfigForm.value.startTime,
    totalSlots: draftConfigForm.value.totalSlots,
    lessonDurationMins: draftConfigForm.value.lessonDurationMins,
    breaks: breaksObj,
  };

  emit('save-schedule-batch', draftLessons.value, configPayload);
  isEditMode.value = false;
}

// Config Breaks Logic for Draft
const sortedBreaks = computed(() => {
  return [...draftConfigForm.value.breaks].sort((a, b) => a.slot - b.slot);
});

function addBreak() {
  const maxSlot = draftConfigForm.value.totalSlots;
  const existingSlots = draftConfigForm.value.breaks.map((b) => b.slot);
  for (let i = 1; i <= maxSlot; i++) {
    if (!existingSlots.includes(i)) {
      draftConfigForm.value.breaks.push({
        id: Math.random().toString(36).substring(2, 9),
        slot: i,
        duration: 10,
      });
      break;
    }
  }
}

function removeBreak(id: string) {
  draftConfigForm.value.breaks = draftConfigForm.value.breaks.filter(
    (b) => b.id !== id,
  );
}

// Substitution Form State
const subForm = ref({
  lessonId: '',
  subject: '',
  room: '',
  slot: null as number | null,
  duration: null as number | null,
  day: null as number | null,
  cancelled: false,
  hide: false,
});

const selectedLesson = ref<Lesson | null>(null);

function getDisplayName(lesson: Lesson): string {
  const subjectName =
    lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
  return subjectName ? subjectName : 'Unbekannt';
}

function onLessonSelected(lesson: Lesson) {
  selectedLesson.value = lesson;
  subForm.value.lessonId = lesson.id;
  subForm.value.subject = '';
  subForm.value.room = '';
  subForm.value.slot = null;
  subForm.value.duration = null;
  subForm.value.day = null;
  subForm.value.cancelled = false;
  subForm.value.hide = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSaveSub() {
  const payload: Record<string, unknown> = { lessonId: subForm.value.lessonId };
  if (subForm.value.subject) payload.subject = subForm.value.subject;
  if (subForm.value.room) payload.room = subForm.value.room;
  if (subForm.value.slot !== null) payload.slot = subForm.value.slot;
  if (subForm.value.duration !== null)
    payload.duration = subForm.value.duration;
  if (subForm.value.day !== null) payload.day = subForm.value.day;
  if (subForm.value.cancelled) payload.cancelled = true;
  if (subForm.value.hide) payload.hide = true;

  emit('save-sub', payload);
  subForm.value = {
    lessonId: '',
    subject: '',
    room: '',
    slot: null,
    duration: null,
    day: null,
    cancelled: false,
    hide: false,
  };
  selectedLesson.value = null;
}

// ----------------------------------------------------
// Visual Schedule Grid Calculation (Using Draft State)
// ----------------------------------------------------

const daysList = computed(() => [
  {
    day: 1,
    label: t('groups.settings.schedule.editor.day_monday'),
    short: 'Mo',
  },
  {
    day: 2,
    label: t('groups.settings.schedule.editor.day_tuesday'),
    short: 'Di',
  },
  {
    day: 3,
    label: t('groups.settings.schedule.editor.day_wednesday'),
    short: 'Mi',
  },
  {
    day: 4,
    label: t('groups.settings.schedule.editor.day_thursday'),
    short: 'Do',
  },
  {
    day: 5,
    label: t('groups.settings.schedule.editor.day_friday'),
    short: 'Fr',
  },
]);

const activeMobileDay = ref(1);

const slotTimes = computed(() => {
  const [startH, startM] = (draftConfigForm.value.startTime || '08:00')
    .split(':')
    .map(Number);
  let currentMins = (startH || 8) * 60 + (startM || 0);

  const breaksMap: Record<number, number> = {};
  draftConfigForm.value.breaks.forEach((b) => {
    breaksMap[b.slot] = b.duration;
  });

  const slots: {
    slot: number;
    time: string;
    startMins: number;
    endMins: number;
  }[] = [];
  const duration = draftConfigForm.value.lessonDurationMins || 45;

  for (let s = 1; s <= draftConfigForm.value.totalSlots; s++) {
    const startM = currentMins;
    const endM = startM + duration;

    const format = (mins: number) => {
      const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    slots.push({
      slot: s,
      time: `${format(startM)} - ${format(endM)}`,
      startMins: startM,
      endMins: endM,
    });

    const breakTime = breaksMap[s] || 0;
    currentMins = endM + breakTime;
  }
  return slots;
});

const lessonGridMap = computed(() => {
  const map: Record<string, Lesson> = {};
  const coveredSet = new Set<string>();

  draftLessons.value.forEach((l) => {
    const d = Number(l.day);
    const s = Number(l.slot);
    map[`${d}-${s}`] = l;
    for (let i = 1; i < l.duration; i++) {
      coveredSet.add(`${d}-${s + i}`);
    }
  });

  return { map, coveredSet };
});

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

// Subject Options directly from group subjects table
const subjectOptions = computed(() => {
  if (!subjects.value || subjects.value.length === 0) return [];
  return subjects.value.map((s) => ({
    label: s.name,
    value: s.id,
  }));
});

// Selected Subject Object
const selectedSubjectObj = computed(() => {
  if (!lessonForm.value.subjectId) return null;
  return (
    subjects.value.find((s) => s.id === lessonForm.value.subjectId) || null
  );
});

// Course Options derived from selected subject's courses
const courseOptions = computed(() => {
  const sub = selectedSubjectObj.value;
  const opts = [
    {
      label: t('groups.settings.schedule.editor.select_course_prompt'),
      value: '',
    },
  ];
  if (sub && sub.courses && sub.courses.length > 0) {
    sub.courses.forEach((c) => {
      opts.push({ label: c.name, value: c.id });
    });
  }
  return opts;
});

// Summary text for selected day & slot at top of modal
const selectedSlotSummary = computed(() => {
  const dObj = daysList.value.find((d) => d.day === lessonForm.value.day);
  const sObj = slotTimes.value.find((s) => s.slot === lessonForm.value.slot);
  const dayName = dObj ? dObj.label : `Tag ${lessonForm.value.day}`;
  const timeStr = sObj ? ` (${sObj.time})` : '';
  return `${dayName} • ${lessonForm.value.slot}. Stunde${timeStr}`;
});

const editingLessonRef = ref<Lesson | null>(null);

watch(subjects, (newSubjects) => {
  if (
    isLessonModalOpen.value &&
    newSubjects.length > 0 &&
    !lessonForm.value.subjectId
  ) {
    if (editingLessonRef.value) {
      const matchedSub = newSubjects.find(
        (s) =>
          (editingLessonRef.value?.subjects?.id &&
            s.id === editingLessonRef.value.subjects.id) ||
          (editingLessonRef.value?.subjectId &&
            s.id === editingLessonRef.value.subjectId) ||
          s.name.toLowerCase() ===
            (editingLessonRef.value?.subject || '').toLowerCase(),
      );
      lessonForm.value.subjectId = matchedSub ? matchedSub.id : '';
    }
  }
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

  const matchedSub = subjects.value.find(
    (s) =>
      (lesson.subjects?.id && s.id === lesson.subjects.id) ||
      (lesson.subjectId && s.id === lesson.subjectId) ||
      s.name.toLowerCase() === (lesson.subject || '').toLowerCase(),
  );

  const matchedSubId = matchedSub ? matchedSub.id : '';

  let matchedCourseId = '';
  if (matchedSub && matchedSub.courses) {
    const matchedCrs = matchedSub.courses.find(
      (c) =>
        (lesson.courseId && c.id === lesson.courseId) ||
        (lesson.courses?.id && c.id === lesson.courses.id) ||
        c.name.toLowerCase() === (lesson.courseName || '').toLowerCase(),
    );
    if (matchedCrs) {
      matchedCourseId = matchedCrs.id;
    }
  }

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
  const subObj = selectedSubjectObj.value;
  if (!subObj) return;

  const crsObj = subObj.courses?.find(
    (c) => c.id === lessonForm.value.courseId,
  );

  const targetId =
    lessonForm.value.id ||
    `les_draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newLesson: Lesson = {
    id: targetId,
    day: Number(lessonForm.value.day),
    slot: Number(lessonForm.value.slot),
    duration: Number(lessonForm.value.duration || 1),
    room: lessonForm.value.room.trim() || null,
    subjectId: subObj.id,
    subject: subObj.name,
    subjectAbbr: subObj.name.substring(0, 3).toUpperCase(),
    subjects: { id: subObj.id, name: subObj.name },
    courseId: crsObj ? crsObj.id : null,
    courseName: crsObj ? crsObj.name : undefined,
    courses: crsObj ? { id: crsObj.id, name: crsObj.name } : null,
  };

  const existingIdx = draftLessons.value.findIndex((l) => l.id === targetId);
  if (existingIdx !== -1) {
    draftLessons.value[existingIdx] = newLesson;
  } else {
    draftLessons.value.push(newLesson);
  }

  closeLessonModal();
}

function handleDeleteLessonFromModal() {
  if (!lessonForm.value.id) return;
  draftLessons.value = draftLessons.value.filter(
    (l) => l.id !== lessonForm.value.id,
  );
  closeLessonModal();
}

onMounted(() => {
  void loadSubjects();
});
</script>

<template>
  <div class="animate-fade-up">
    <PageHeader>
      <span>{{
        isEditMode
          ? t('groups.settings.schedule.editor.title')
          : t('groups.settings.schedule.changes.title')
      }}</span>

      <template #info>
        <InfoModal
          tooltip="t('groups.settings.schedule.info.tooltip')"
          title="Stundenplaneinstellungen"
        >
          <h3>
            {{ t('groups.settings.schedule.config.instruction_text') }}
          </h3>
        </InfoModal>
      </template>

      <template #action>
        <div class="flex items-center gap-2">
          <BaseTooltip v-if="!isEditMode" content="Aktualisieren">
            <BaseButton
              :disabled="loadingLessons || loadingSubs"
              variant="ghost"
              :icon="RefreshCw"
              @click="emit('refresh')"
            />
          </BaseTooltip>

          <BaseButton
            v-if="!isEditMode && canEditScheduleConfig"
            variant="ghost"
            :icon="Pencil"
            @click="enterEditMode"
          >
            {{ t('groups.settings.schedule.editor.edit_schedule_button') }}
          </BaseButton>

          <template v-if="isEditMode">
            <BaseButton variant="ghost" :icon="X" @click="cancelEditMode">
              {{ t('groups.settings.schedule.editor.cancel_button') }}
            </BaseButton>
            <BaseButton
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
          </template>
        </div>
      </template>
    </PageHeader>

    <div v-if="isEditMode" class="flex flex-col gap-6">
      <div class="p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3
            class="m-0 text-base font-semibold text-on-ghost flex items-center gap-2"
          >
            <Calendar class="size-4 text-action" />
            {{ t('groups.settings.schedule.editor.grid_title') }}
          </h3>
          <span class="text-xs text-on-ghost-muted">
            Klicke auf einen Slot, um Stunden einzutragen oder zu bearbeiten.
          </span>
        </div>

        <div class="flex sm:hidden gap-1 mb-4 bg-ghost-hover/30 p-1 rounded-lg">
          <button
            v-for="d in daysList"
            :key="d.day"
            type="button"
            class="flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all text-center"
            :class="
              activeMobileDay === d.day
                ? 'bg-action text-on-action shadow-xs'
                : 'text-on-ghost-muted hover:text-on-ghost'
            "
            @click="activeMobileDay = d.day"
          >
            {{ d.short }}
          </button>
        </div>

        <BaseTableWrapper>
          <div class="w-full min-w-[300px]">
            <div class="hidden sm:grid grid-cols-[80px_repeat(5,1fr)] gap-2">
              <div
                class="text-xs text-on-ghost-muted font-medium p-2 text-center"
              >
                Zeit
              </div>
              <div
                v-for="d in daysList"
                :key="d.day"
                class="bg-ghost-hover/40 text-on-ghost font-semibold text-sm p-2 text-center rounded-lg border border-ghost-border"
              >
                {{ d.label }}
              </div>

              <template v-for="sObj in slotTimes" :key="sObj.slot">
                <div
                  class="text-[11px] text-on-ghost-muted font-mono flex items-center justify-center p-1 text-center"
                >
                  <div>
                    <div class="font-bold text-on-ghost">
                      Std {{ sObj.slot }}
                    </div>
                    <div class="text-[10px] opacity-80">{{ sObj.time }}</div>
                  </div>
                </div>

                <template v-for="d in daysList" :key="`${d.day}-${sObj.slot}`">
                  <template
                    v-if="
                      !lessonGridMap.coveredSet.has(`${d.day}-${sObj.slot}`)
                    "
                  >
                    <div
                      v-if="lessonGridMap.map[`${d.day}-${sObj.slot}`]"
                      class="relative group rounded-md max-[500px]:px-2.5 max-[500px]:py-1.5 px-2 py-1 border border-ghost-border bg-surface text-on-ghost hover:bg-surface-hover hover:border-ghost-hover-border transition-all cursor-pointer shadow-input flex flex-col justify-between"
                      :style="{
                        gridRow: `span ${
                          lessonGridMap.map[`${d.day}-${sObj.slot}`].duration
                        }`,
                      }"
                      @click.stop="
                        openEditLessonModal(
                          lessonGridMap.map[`${d.day}-${sObj.slot}`],
                        )
                      "
                    >
                      <div>
                        <div class="font-bold text-base truncate">
                          {{
                            getDisplayName(
                              lessonGridMap.map[`${d.day}-${sObj.slot}`],
                            )
                          }}
                        </div>
                        <div
                          v-if="lessonGridMap.map[`${d.day}-${sObj.slot}`].room"
                          class="text-sm text-on-ghost-muted truncate"
                        >
                          {{ lessonGridMap.map[`${d.day}-${sObj.slot}`].room }}
                        </div>
                        <div
                          v-if="
                            lessonGridMap.map[`${d.day}-${sObj.slot}`]
                              .courseName ||
                            lessonGridMap.map[`${d.day}-${sObj.slot}`].courses
                              ?.name
                          "
                          class="text-[9px] inline-block px-1.5 py-0.5 rounded bg-ghost-hover text-on-ghost-muted mt-1 font-semibold truncate"
                        >
                          {{
                            lessonGridMap.map[`${d.day}-${sObj.slot}`].courses
                              ?.name ||
                            lessonGridMap.map[`${d.day}-${sObj.slot}`]
                              .courseName
                          }}
                        </div>
                      </div>
                    </div>

                    <button
                      v-else
                      type="button"
                      class="h-12 border border-dashed border-ghost-border hover:border-action/50 hover:bg-action/5 rounded-xl transition-all flex items-center justify-center group cursor-pointer"
                      @click.stop="openAddLessonModal(d.day, sObj.slot)"
                    >
                      <Plus
                        class="text-on-ghost-muted group-hover:text-action transition-transform group-hover:scale-110"
                        :size="20"
                      />
                    </button>
                  </template>
                </template>
              </template>
            </div>

            <div class="sm:hidden flex flex-col gap-2">
              <div
                v-for="sObj in slotTimes"
                :key="sObj.slot"
                class="flex items-stretch gap-2"
              >
                <div
                  class="w-20 shrink-0 bg-ghost-hover/20 p-2 rounded-xl border border-ghost-border flex flex-col justify-center text-center"
                >
                  <span class="text-xs font-bold text-on-ghost"
                    >Std {{ sObj.slot }}</span
                  >
                  <span class="text-[10px] text-on-ghost-muted">{{
                    sObj.time
                  }}</span>
                </div>

                <div class="flex-1 min-w-0">
                  <template
                    v-if="
                      !lessonGridMap.coveredSet.has(
                        `${activeMobileDay}-${sObj.slot}`,
                      )
                    "
                  >
                    <div
                      v-if="
                        lessonGridMap.map[`${activeMobileDay}-${sObj.slot}`]
                      "
                      class="p-3 rounded-xl border border-ghost-border bg-surface text-on-ghost hover:bg-surface-hover hover:border-ghost-hover-border transition-all cursor-pointer shadow-input flex items-center justify-between"
                      @click.stop="
                        openEditLessonModal(
                          lessonGridMap.map[`${activeMobileDay}-${sObj.slot}`],
                        )
                      "
                    >
                      <div>
                        <div class="font-bold text-sm">
                          {{
                            getDisplayName(
                              lessonGridMap.map[
                                `${activeMobileDay}-${sObj.slot}`
                              ],
                            )
                          }}
                        </div>
                        <div class="text-xs opacity-90">
                          <span
                            v-if="
                              lessonGridMap.map[
                                `${activeMobileDay}-${sObj.slot}`
                              ].room
                            "
                          >
                            {{
                              lessonGridMap.map[
                                `${activeMobileDay}-${sObj.slot}`
                              ].room
                            }}
                          </span>
                          <span
                            v-if="
                              lessonGridMap.map[
                                `${activeMobileDay}-${sObj.slot}`
                              ].duration > 1
                            "
                            class="ml-2 font-semibold"
                          >
                            ({{
                              lessonGridMap.map[
                                `${activeMobileDay}-${sObj.slot}`
                              ].duration
                            }}
                            Std)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      v-else
                      type="button"
                      class="w-full h-12 border border-dashed border-ghost-border hover:border-action/50 rounded-xl transition-all flex items-center justify-between px-3 text-xs text-on-ghost-muted hover:text-action cursor-pointer"
                      @click.stop="
                        openAddLessonModal(activeMobileDay, sObj.slot)
                      "
                    >
                      <span>{{
                        t('groups.settings.schedule.editor.add_lesson_slot')
                      }}</span>
                      <Plus class="size-4" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </BaseTableWrapper>
      </div>

      <div class="p-4 sm:p-6">
        <h3
          class="mt-0 mb-4 text-base font-semibold text-on-ghost flex items-center gap-2"
        >
          <Clock class="size-4 text-action" />
          {{ t('groups.settings.schedule.editor.plan_config_title') }}
        </h3>

        <div class="grid grid-cols-3 gap-4 mb-4 sm:grid-cols-1">
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

      <div class="flex items-center justify-end gap-3 pt-2">
        <BaseButton variant="ghost" :icon="X" @click="cancelEditMode">
          {{ t('groups.settings.schedule.editor.cancel_button') }}
        </BaseButton>
        <BaseButton
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
    </div>

    <div v-else class="flex flex-col gap-6">
      <div class="p-4 sm:p-6">
        <h3
          class="mt-0 mb-4 text-base font-semibold text-on-ghost flex items-center justify-between"
        >
          <span>Stundenplan Übersicht</span>
          <span class="text-xs font-normal text-on-ghost-muted">
            Klicke auf eine Stunde, um eine Planänderung einzutragen.
          </span>
        </h3>

        <div
          v-if="loadingLessons"
          class="text-center p-8 text-on-ghost-muted text-base"
        >
          Lade Stundenplan...
        </div>
        <AdminSchedule
          v-else
          :lessons="lessons"
          :selected-lesson-id="subForm.lessonId"
          class="py-2"
          @select-lesson="onLessonSelected"
        />
      </div>

      <div v-if="selectedLesson" class="p-4 sm:p-6 animate-fade-down">
        <h3 class="mt-0 mb-2 text-lg text-action font-semibold">
          {{ t('groups.settings.schedule.changes.selected_lesson') }}
        </h3>
        <p class="m-0 mb-4 text-on-ghost-muted text-sm">
          {{ t('groups.settings.schedule.changes.replaces_prefix') }}
          <strong>{{ getDisplayName(selectedLesson) }}</strong> ({{
            t('groups.settings.schedule.changes.lesson_label')
          }}
          {{ selectedLesson.slot }},
          {{ t('groups.settings.schedule.changes.last_lesson_label') }}
          {{ selectedLesson.slot + selectedLesson.duration - 1 }},
          {{ t('groups.settings.schedule.changes.room_label') }}
          {{ selectedLesson.room || '-' }},
          {{ t('groups.settings.schedule.changes.day_label') }}
          {{ selectedLesson.day }})
        </p>

        <div class="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-1">
          <input v-model="subForm.lessonId" type="hidden" />
          <div class="form-field">
            <BaseLabel for="sub-subject">{{
              t('groups.settings.schedule.changes.new_subject_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-subject"
              v-model="subForm.subject"
              placeholder="Deutsch"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-room">{{
              t('groups.settings.schedule.changes.new_room_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-room"
              v-model="subForm.room"
              placeholder="A101"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-slot">{{
              t('groups.settings.schedule.changes.new_slot_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-slot"
              v-model.number="subForm.slot"
              type="number"
              placeholder="4"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-duration">{{
              t('groups.settings.schedule.changes.new_duration_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-duration"
              v-model.number="subForm.duration"
              type="number"
              min="1"
              placeholder="2"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-day">{{
              t('groups.settings.schedule.changes.new_day_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-day"
              v-model.number="subForm.day"
              type="number"
              min="1"
              max="5"
              placeholder="2"
              :disabled="!canManageScheduleChanges"
            />
          </div>
        </div>

        <div class="flex gap-6 mt-4 mb-6">
          <BaseCheckbox
            v-model="subForm.cancelled"
            :disabled="!canManageScheduleChanges"
          >
            <span>{{
              t('groups.settings.schedule.changes.cancelled_label')
            }}</span>
          </BaseCheckbox>
          <BaseCheckbox
            v-model="subForm.hide"
            :disabled="!canManageScheduleChanges"
          >
            <span>{{ t('groups.settings.schedule.changes.hide_label') }}</span>
          </BaseCheckbox>
        </div>

        <div class="flex gap-3">
          <BaseButton
            :disabled="
              savingSub || !subForm.lessonId || !canManageScheduleChanges
            "
            variant="action"
            @click="handleSaveSub"
          >
            {{
              savingSub ? t('common.buttons.saving') : t('common.buttons.save')
            }}
          </BaseButton>
          <BaseButton variant="ghost" @click="selectedLesson = null">
            {{ t('common.buttons.cancel') }}
          </BaseButton>
        </div>
      </div>

      <div
        class="bg-surface border border-ghost-border rounded-xl p-4 sm:p-6 shadow-sm"
      >
        <h3 class="mt-0 mb-4 text-base font-semibold text-on-ghost">
          Eingetragene Planänderungen
        </h3>

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
                <th>Subject</th>
                <th>Room</th>
                <th>Day</th>
                <th>Slot</th>
                <th>Cancelled</th>
                <th>Hidden</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in subs" :key="sub.id">
                <td>{{ sub.subject || 'Unbekannt' }}</td>
                <td>{{ sub.room || '-' }}</td>
                <td>{{ sub.day || '-' }}</td>
                <td>{{ sub.slot || '-' }}</td>
                <td class="text-danger">
                  {{ sub.cancelled ? 'Ausfall' : '-' }}
                </td>
                <td>{{ sub.hide ? 'Versteckt' : '-' }}</td>
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
                      @click="emit('delete-sub', sub.id)"
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
      :requirement="!(subjects.length === 0 || !lessonForm.subjectId)"
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
        <div
          class="flex items-center gap-2 p-3 bg-action/10 border border-action/20 rounded-xl text-action font-semibold text-sm"
        >
          <Calendar class="size-4 shrink-0" />
          <span>{{ selectedSlotSummary }}</span>
        </div>

        <div
          v-if="subjects.length === 0"
          class="text-xs text-warning bg-warning/10 border border-warning/20 p-3 rounded-lg flex items-center gap-2"
        >
          <BookOpen class="size-4 shrink-0" />
          <span>
            Es sind noch keine Fächer in dieser Gruppe vorhanden. Bitte erstelle
            zuerst Fächer unter "Fächer" in den Gruppeneinstellungen.
          </span>
        </div>

        <template v-else>
          <BaseFormGroup id="lesson-subject">
            <BaseLabel for="lesson-subject-select" :required="true">{{
              t('groups.settings.schedule.editor.subject_label')
            }}</BaseLabel>
            <BaseSelect
              id="lesson-subject-select"
              v-model="lessonForm.subjectId"
              :options="subjectOptions"
              classes="w-full"
            />
          </BaseFormGroup>

          <BaseFormGroup
            v-if="
              selectedSubjectObj &&
              selectedSubjectObj.courses &&
              selectedSubjectObj.courses.length > 0
            "
            id="lesson-course"
          >
            <BaseLabel for="lesson-course-select">{{
              t('groups.settings.schedule.editor.course_label')
            }}</BaseLabel>
            <BaseSelect
              id="lesson-course-select"
              v-model="lessonForm.courseId"
              :options="courseOptions"
              classes="w-full"
            />
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
            <BaseLabel for="lesson-dur-input" :required="true">{{
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
        <BaseButton
          v-if="lessonForm.id"
          type="button"
          variant="ghost"
          :icon="Trash2"
          @click="handleDeleteLessonFromModal"
        >
          {{ t('groups.settings.schedule.editor.delete_lesson_button') }}
        </BaseButton>
      </template>

      <template #action-text>
        {{ t('groups.settings.schedule.editor.save_lesson_button') }}
      </template>
    </BaseModal>
  </div>
</template>
