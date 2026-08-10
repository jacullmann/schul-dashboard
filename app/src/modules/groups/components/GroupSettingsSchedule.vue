<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue';
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
import type { ScheduleSubstitution } from '@/modules/groups/types';
import type { Lesson } from '@/modules/schedule/types';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';

const { t } = useI18n();
const { width: windowWidth } = useWindowSize();

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
  (e: 'update-schedule-config', payload: Record<string, unknown>): void;
  (
    e: 'save-schedule-batch',
    updatedLessons: Lesson[],
    configPayload?: Record<string, unknown>,
    onSuccess?: () => void,
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
const showToolbar = ref(false);
const draftLessons = ref<Lesson[]>([]);
const hasSwitchedFromEditor = ref(false);

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
  hasSwitchedFromEditor.value = true;
  void loadSubjects();
  draftLessons.value = JSON.parse(JSON.stringify(props.lessons || []));
  draftConfigForm.value = JSON.parse(JSON.stringify(configForm.value));
  clearSelection();
  historyStack.value = [];
  historyIndex.value = -1;
  pushHistoryState(draftLessons.value);
  showToolbar.value = false;
  isEditMode.value = true;
  void nextTick(() => {
    requestAnimationFrame(() => {
      showToolbar.value = true;
    });
  });
}

function cancelEditMode() {
  showToolbar.value = false;
  setTimeout(() => {
    isEditMode.value = false;
    draftLessons.value = [];
    draftConfigForm.value = JSON.parse(JSON.stringify(configForm.value));
    clearSelection();
  }, 300);
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

  emit('save-schedule-batch', draftLessons.value, configPayload, () => {
    showToolbar.value = false;
    setTimeout(() => {
      isEditMode.value = false;
    }, 300);
  });
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
  courseId: null as string | null,
  subject: '',
  room: '',
  slot: null as number | null,
  duration: null as number | null,
  day: null as number | null,
  cancelled: false,
  hide: false,
});

const selectedLesson = ref<Lesson | null>(null);

const selectedLessonSubject = computed(() => {
  if (!selectedLesson.value) return null;
  const subId =
    selectedLesson.value.subjectId || selectedLesson.value.subjects?.id;
  return (
    subjects.value.find(
      (s) =>
        s.id === subId ||
        s.name.toLowerCase() ===
          (selectedLesson.value?.subject || '').toLowerCase(),
    ) || null
  );
});

const targetCourseOptions = computed(() => {
  const sub = selectedLessonSubject.value;
  const opts = [{ label: 'Alle Kurse des Fachs', value: '' }];
  if (sub && sub.courses && sub.courses.length > 0) {
    sub.courses.forEach((c: { id: string; name: string }) => {
      opts.push({ label: c.name, value: c.id });
    });
  }
  return opts;
});

function getSubCourseName(courseId?: string | null): string {
  if (!courseId) return 'Alle Kurse';
  for (const s of subjects.value) {
    if (s.courses) {
      const c = s.courses.find((crs: any) => crs.id === courseId);
      if (c) return c.name;
    }
  }
  return 'Spezifischer Kurs';
}

function getDisplayName(lesson: Lesson): string {
  const subjectName =
    lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
  return subjectName || 'Unbekannt';
}

function onLessonSelected(lesson: Lesson) {
  selectedLesson.value = lesson;
  subForm.value.lessonId = lesson._originalId || lesson.id;
  subForm.value.courseId = lesson.courseId || null;
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
  const payload: Record<string, unknown> = {
    lessonId: subForm.value.lessonId,
  };
  if (subForm.value.courseId) payload.courseId = subForm.value.courseId;
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
    courseId: null,
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

const dayTabItems = computed(() =>
  daysList.value.map((d) => ({
    id: String(d.day),
    label: d.short,
  })),
);

const activeMobileDay = ref(1);

const timeCellRefs = new Map<number, HTMLElement>();
function setTimeCellRef(slot: number, el: unknown) {
  if (el) {
    timeCellRefs.set(slot, el as HTMLElement);
  } else {
    timeCellRefs.delete(slot);
  }
}

const contentCellRefs = new Map<number, HTMLElement>();
function setContentCellRef(slot: number, el: unknown) {
  if (el) {
    contentCellRefs.set(slot, el as HTMLElement);
  } else {
    contentCellRefs.delete(slot);
  }
}

watch(activeMobileDay, async () => {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const oldHeights = new Map<number, number>();
  timeCellRefs.forEach((el, slot) => {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) {
      oldHeights.set(slot, rect.height);
    }
  });

  await nextTick();

  timeCellRefs.forEach((timeEl, slot) => {
    const oldH = oldHeights.get(slot);
    const newRect = timeEl.getBoundingClientRect();
    const newH = newRect.height;

    if (oldH && newH > 0 && Math.abs(oldH - newH) > 0.5) {
      timeEl.getAnimations().forEach((a) => a.cancel());
      timeEl.animate([{ height: `${oldH}px` }, { height: `${newH}px` }], {
        duration: 250,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      });

      const contentEl = contentCellRefs.get(slot);
      if (contentEl) {
        contentEl.getAnimations().forEach((a) => a.cancel());
        contentEl.animate([{ height: `${oldH}px` }, { height: `${newH}px` }], {
          duration: 250,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        });
      }
    }
  });
});

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
    const slotStartM = currentMins;
    const endM = slotStartM + duration;

    const format = (mins: number) => {
      const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    slots.push({
      slot: s,
      time: `${format(slotStartM)} - ${format(endM)}`,
      startMins: slotStartM,
      endMins: endM,
    });

    const breakTime = breaksMap[s] || 0;
    currentMins = endM + breakTime;
  }
  return slots;
});

const lessonGridMap = computed(() => {
  const map: Record<string, Lesson[]> = {};
  const coveredSet = new Set<string>();

  draftLessons.value.forEach((l) => {
    const d = Number(l.day);
    const s = Number(l.slot);
    const key = `${d}-${s}`;
    if (!map[key]) map[key] = [];
    map[key].push(l);
    for (let i = 1; i < l.duration; i++) {
      coveredSet.add(`${d}-${s + i}`);
    }
  });

  return { map, coveredSet };
});

// ----------------------------------------------------
// Undo / Redo History System State
// ----------------------------------------------------
const historyStack = ref<Lesson[][]>([]);
const historyIndex = ref<number>(-1);
const MAX_HISTORY = 50;

function pushHistoryState(lessons: Lesson[]) {
  const currentStack = historyStack.value.slice(0, historyIndex.value + 1);
  const snapshot = JSON.parse(JSON.stringify(lessons));
  currentStack.push(snapshot);
  if (currentStack.length > MAX_HISTORY) {
    currentStack.shift();
  }
  historyStack.value = currentStack;
  historyIndex.value = currentStack.length - 1;
}

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(
  () => historyIndex.value < historyStack.value.length - 1,
);

function undo() {
  if (!canUndo.value) return;
  historyIndex.value--;
  draftLessons.value = JSON.parse(
    JSON.stringify(historyStack.value[historyIndex.value]),
  );
  clearSelection();
}

function redo() {
  if (!canRedo.value) return;
  historyIndex.value++;
  draftLessons.value = JSON.parse(
    JSON.stringify(historyStack.value[historyIndex.value]),
  );
  clearSelection();
}

// ----------------------------------------------------
// Lesson Selection & Context Menu Action State
// ----------------------------------------------------
const selectedLessonIds = ref<string[]>([]);
const lastSelectedLessonId = ref<string | null>(null);
const mobileMenuOpen = ref(false);

function isLessonSelected(id: string): boolean {
  return selectedLessonIds.value.includes(id);
}

function clearSelection() {
  selectedLessonIds.value = [];
  lastSelectedLessonId.value = null;
  mobileMenuOpen.value = false;
}

function selectSingleLesson(id: string) {
  selectedLessonIds.value = [id];
  lastSelectedLessonId.value = id;
}

function toggleLessonSelection(id: string) {
  if (isLessonSelected(id)) {
    selectedLessonIds.value = selectedLessonIds.value.filter((i) => i !== id);
  } else {
    selectedLessonIds.value.push(id);
  }
  lastSelectedLessonId.value = id;
}

function selectRangeToLesson(targetId: string, isCtrlPressed = false) {
  if (!lastSelectedLessonId.value) {
    selectSingleLesson(targetId);
    return;
  }

  const anchorLesson = draftLessons.value.find(
    (l) => l.id === lastSelectedLessonId.value,
  );
  const targetLesson = draftLessons.value.find((l) => l.id === targetId);

  if (!anchorLesson || !targetLesson) {
    selectSingleLesson(targetId);
    return;
  }

  const dayMin = Math.min(Number(anchorLesson.day), Number(targetLesson.day));
  const dayMax = Math.max(Number(anchorLesson.day), Number(targetLesson.day));

  const anchorEndSlot =
    Number(anchorLesson.slot) +
    Math.max(1, Number(anchorLesson.duration || 1)) -
    1;
  const targetEndSlot =
    Number(targetLesson.slot) +
    Math.max(1, Number(targetLesson.duration || 1)) -
    1;

  const slotMin = Math.min(
    Number(anchorLesson.slot),
    Number(targetLesson.slot),
  );
  const slotMax = Math.max(anchorEndSlot, targetEndSlot);

  const rangeLessons = draftLessons.value.filter((l) => {
    const lDay = Number(l.day);
    const lStart = Number(l.slot);
    const lEnd = lStart + Math.max(1, Number(l.duration || 1)) - 1;

    const dayMatches = lDay >= dayMin && lDay <= dayMax;
    const slotMatches = lStart <= slotMax && lEnd >= slotMin;

    return dayMatches && slotMatches;
  });

  const rangeIds = rangeLessons.map((l) => l.id);

  if (isCtrlPressed) {
    const set = new Set([...selectedLessonIds.value, ...rangeIds]);
    selectedLessonIds.value = Array.from(set);
  } else {
    selectedLessonIds.value = rangeIds;
  }
}

function selectDayColumn(dayNumber: number, event?: MouseEvent) {
  if (!isEditMode.value) return;

  const dayLessons = draftLessons.value.filter(
    (l) => Number(l.day) === dayNumber,
  );
  if (dayLessons.length === 0) return;

  const dayLessonIds = dayLessons.map((l) => l.id);
  const isCtrlPressed = event ? event.ctrlKey || event.metaKey : false;
  const isAllDaySelected = dayLessonIds.every((id) =>
    selectedLessonIds.value.includes(id),
  );

  if (isCtrlPressed) {
    if (isAllDaySelected) {
      const daySet = new Set(dayLessonIds);
      selectedLessonIds.value = selectedLessonIds.value.filter(
        (id) => !daySet.has(id),
      );
    } else {
      const set = new Set([...selectedLessonIds.value, ...dayLessonIds]);
      selectedLessonIds.value = Array.from(set);
    }
  } else {
    if (
      isAllDaySelected &&
      selectedLessonIds.value.length === dayLessonIds.length
    ) {
      clearSelection();
    } else {
      selectedLessonIds.value = dayLessonIds;
    }
  }

  if (dayLessons.length > 0) {
    lastSelectedLessonId.value = dayLessons[0].id;
  }
}

// Native contextmenu handling (Hold on Mobile / Right-click on Desktop)
function handleContextMenu(lesson: Lesson, event?: UIEvent) {
  if (event) {
    event.preventDefault();
  }
  if (!isEditMode.value) return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(40);
    } catch {
      // Ignore vibration errors if not supported/permitted
    }
  }

  selectSingleLesson(lesson.id);
  mobileMenuOpen.value = true;
}

function handleLessonClick(lesson: Lesson, event: MouseEvent) {
  // On Mobile: Tapping an existing lesson directly opens edit modal
  if (windowWidth.value < 768) {
    openEditLessonModal(lesson);
    return;
  }

  // On Desktop: Perform selection logic
  if (event.shiftKey) {
    selectRangeToLesson(lesson.id, event.ctrlKey || event.metaKey);
  } else if (event.ctrlKey || event.metaKey) {
    toggleLessonSelection(lesson.id);
  } else {
    selectSingleLesson(lesson.id);
  }
}

function handleAddLessonFromSelection() {
  if (selectedLessonIds.value.length !== 1) return;
  const selId = selectedLessonIds.value[0];
  const targetLesson = draftLessons.value.find((l) => l.id === selId);
  if (!targetLesson) return;
  mobileMenuOpen.value = false;
  openAddLessonModal(targetLesson.day, targetLesson.slot);
}

function handleEditLessonFromSelection() {
  if (selectedLessonIds.value.length !== 1) return;
  const selId = selectedLessonIds.value[0];
  const targetLesson = draftLessons.value.find((l) => l.id === selId);
  if (!targetLesson) return;
  mobileMenuOpen.value = false;
  openEditLessonModal(targetLesson);
}

function handleDeleteSelection() {
  if (selectedLessonIds.value.length === 0) return;
  const toDelete = new Set(selectedLessonIds.value);
  draftLessons.value = draftLessons.value.filter((l) => !toDelete.has(l.id));
  clearSelection();
  pushHistoryState(draftLessons.value);
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

function getSlotTimeRange(startSlot: number, endSlot: number): string {
  const [startH, startM] = (draftConfigForm.value.startTime || '08:00')
    .split(':')
    .map(Number);
  let currentMins = (startH || 8) * 60 + (startM || 0);

  const breaksMap: Record<number, number> = {};
  draftConfigForm.value.breaks.forEach((b) => {
    if (b.slot) {
      breaksMap[Number(b.slot)] = Number(b.duration || 0);
    }
  });

  const lessonDur = Number(draftConfigForm.value.lessonDurationMins || 45);

  let rangeStartTime = '';
  let rangeEndTime = '';

  for (let s = 1; s <= endSlot; s++) {
    const slotStartM = currentMins;
    const endM = slotStartM + lessonDur;

    if (s === startSlot) {
      const h = Math.floor(slotStartM / 60)
        .toString()
        .padStart(2, '0');
      const m = (slotStartM % 60).toString().padStart(2, '0');
      rangeStartTime = `${h}:${m}`;
    }

    if (s === endSlot) {
      const h = Math.floor(endM / 60)
        .toString()
        .padStart(2, '0');
      const m = (endM % 60).toString().padStart(2, '0');
      rangeEndTime = `${h}:${m}`;
    }

    const breakTime = breaksMap[s] || 0;
    currentMins = endM + breakTime;
  }

  if (rangeStartTime && rangeEndTime) {
    return `${rangeStartTime} - ${rangeEndTime}`;
  }
  return '';
}

// Summary text for selected day & slot at top of modal
const selectedSlotSummary = computed(() => {
  const dObj = daysList.value.find((d) => d.day === lessonForm.value.day);
  const dayName = dObj ? dObj.label : `Tag ${lessonForm.value.day}`;

  const startSlot = Number(lessonForm.value.slot);
  const duration = Math.max(1, Number(lessonForm.value.duration || 1));
  const endSlot = startSlot + duration - 1;

  const timeRange = getSlotTimeRange(startSlot, endSlot);
  const timeStr = timeRange ? ` (${timeRange})` : '';

  const slotRangeStr =
    duration > 1 ? `${startSlot}.-${endSlot}.` : `${startSlot}.`;

  return `${dayName}, ${slotRangeStr} Stunde${timeStr}`;
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
          s.id === editingLessonRef.value?.subjects?.id ||
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
      s.id === lesson.subjects?.id ||
      (lesson.subjectId && s.id === lesson.subjectId) ||
      s.name.toLowerCase() === (lesson.subject || '').toLowerCase(),
  );

  const matchedSubId = matchedSub ? matchedSub.id : '';

  lessonForm.value = {
    id: lesson.id,
    day: Number(lesson.day),
    slot: Number(lesson.slot),
    duration: Number(lesson.duration || 1),
    room: lesson.room || '',
    subjectId: matchedSubId,
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
  };

  const existingIdx = draftLessons.value.findIndex((l) => l.id === targetId);
  if (existingIdx !== -1) {
    draftLessons.value[existingIdx] = newLesson;
  } else {
    draftLessons.value.push(newLesson);
  }

  pushHistoryState(draftLessons.value);
  closeLessonModal();
}

onMounted(() => {
  void loadSubjects();
  window.addEventListener('keydown', handleWindowKeyDown);
  window.addEventListener('click', handleGlobalClick);
  if (isEditMode.value) {
    showToolbar.value = true;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeyDown);
  window.removeEventListener('click', handleGlobalClick);
  timeCellRefs.clear();
  contentCellRefs.clear();
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
          :tooltip="t('groups.settings.schedule.info.tooltip')"
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

          <BaseTooltip
            :content="t('groups.settings.schedule.editor.edit_schedule_button')"
            placement="bottom"
          >
            <BaseButton
              v-if="!isEditMode && canEditScheduleConfig"
              variant="ghost"
              :icon="Pencil"
              @click="enterEditMode"
            />
          </BaseTooltip>

          <template v-if="isEditMode">
            <BaseButton
              v-if="windowWidth <= 768"
              variant="ghost"
              :icon="X"
              @click="cancelEditMode"
            />
            <BaseButton
              v-else
              variant="ghost"
              :icon="X"
              @click="cancelEditMode"
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
          </template>
        </div>
      </template>
    </PageHeader>

    <div v-if="isEditMode" class="flex flex-col gap-6">
      <div class="sm:p-6">
        <!--div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-on-ghost">
            {{ t('groups.settings.schedule.editor.grid_title') }}
          </h3>
        </div-->

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
                  <BaseTooltip content="Rückgängig (Strg+Z)" placement="bottom">
                    <BaseButton
                      variant="ghost"
                      :icon="Undo2"
                      :disabled="!canUndo"
                      @click="undo"
                    />
                  </BaseTooltip>

                  <BaseTooltip
                    content="Wiederholen (Strg+Y)"
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
                    >{{ selectedLessonIds.length }} ausgewählt
                  </span>
                </div>

                <div class="hidden sm:flex flex-wrap items-center gap-2">
                  <BaseButton
                    variant="ghost"
                    :icon="Plus"
                    :disabled="selectedLessonIds.length !== 1"
                    @click="handleAddLessonFromSelection"
                  >
                    {{ t('groups.settings.schedule.editor.add_lesson_slot') }}
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    :icon="Pencil"
                    :disabled="selectedLessonIds.length !== 1"
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
          :is-editable="true"
          :selected-lesson-ids="selectedLessonIds"
          :time-slots="slotTimes"
          :animated="false"
          @select-lesson="handleLessonClick"
          @select-day="selectDayColumn"
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
      <div class="sm:p-6">
        <div
          v-if="loadingLessons"
          class="text-center p-8 text-on-ghost-muted text-base"
        >
          Lade Stundenplan...
        </div>
        <AdminSchedule
          v-else
          :lessons="lessons"
          :subjects="subjects"
          :selected-lesson-id="subForm.lessonId"
          :animated="!hasSwitchedFromEditor"
          @select-lesson="onLessonSelected"
        />
      </div>

      <div v-if="selectedLesson" class="sm:p-6 animate-fade-down">
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
          <div
            v-if="
              selectedLessonSubject &&
              selectedLessonSubject.courses &&
              selectedLessonSubject.courses.length > 0
            "
            class="form-field col-span-2 sm:col-span-1"
          >
            <BaseLabel for="sub-course-select">Betroffener Kurs</BaseLabel>
            <BaseSelect
              id="sub-course-select"
              v-model="subForm.courseId"
              :options="targetCourseOptions"
              classes="w-full"
              :disabled="!canManageScheduleChanges"
            />
          </div>
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

      <div class="sm:p-6">
        <h3>Eingetragene Planänderungen</h3>

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
                <th>Course</th>
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
                <td>{{ getSubCourseName(sub.courseId) }}</td>
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
        <div class="text-base text-on-ghost-muted">
          {{ selectedSlotSummary }}
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
      </template>

      <template #action-text>
        {{ t('groups.settings.schedule.editor.save_lesson_button') }}
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
        :disabled="selectedLessonIds.length !== 1"
        @click="handleAddLessonFromSelection"
      >
        {{ t('groups.settings.schedule.editor.add_lesson_slot') }}
      </BaseMenuButton>
      <BaseMenuButton
        :icon="Pencil"
        :disabled="selectedLessonIds.length !== 1"
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
