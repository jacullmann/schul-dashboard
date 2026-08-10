<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { Plus } from '@lucide/vue';
import type { Lesson } from '@/modules/schedule/types';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleRowSync } from '@/modules/schedule/composables/useScheduleRowSync';

import ScheduleTimeColumn from '@/modules/schedule/components/ScheduleTimeColumn.vue';
import ScheduleLessonGroup from '@/modules/schedule/components/ScheduleLessonGroup.vue';

const {
  formatDayName,
  days,
  timeSlots,
  getGroupStyle,
  getDisplayName,
  defaultDayIndex,
} = useSchedule({ autoLoad: false });

const props = withDefaults(
  defineProps<{
    lessons: Lesson[];
    subjects?: any[];
    selectedLessonId?: string;
    selectedLessonIds?: string[];
    isEditable?: boolean;
    animated?: boolean;
    timeSlots?: Array<{ slot: number; time: string }>;
  }>(),
  {
    animated: true,
    isEditable: false,
    selectedLessonIds: () => [],
  },
);

const emit = defineEmits<{
  (e: 'select-lesson', lesson: Lesson, event?: MouseEvent): void;
  (e: 'select-day', day: number, event?: MouseEvent): void;
  (e: 'add-lesson', payload: { day: number; slot: number }): void;
  (e: 'contextmenu-lesson', lesson: Lesson, event: UIEvent): void;
}>();

const effectiveTimeSlots = computed(() => {
  if (props.timeSlots && props.timeSlots.length > 0) {
    return props.timeSlots;
  }
  return timeSlots.value;
});

const displayLessons = computed(() => {
  if (!props.lessons || props.lessons.length === 0) return [];
  if (!props.subjects || props.subjects.length === 0) return props.lessons;

  const subjectMap = new Map<string, any>();
  props.subjects.forEach((s) => {
    if (s && s.id) subjectMap.set(s.id, s);
  });

  return props.lessons.map((lesson) => {
    const subId = lesson.subjectId || lesson.subjects?.id;
    const subObj = subId ? subjectMap.get(subId) : null;
    const courses: Array<{ id: string; name: string }> = subObj?.courses || [];

    if (courses.length > 1) {
      return {
        ...lesson,
        courseCount: courses.length,
        subjects:
          lesson.subjects ||
          (subObj ? { id: subObj.id, name: subObj.name } : null),
      };
    } else if (courses.length === 1) {
      const c = courses[0];
      return {
        ...lesson,
        courseId: lesson.courseId || c.id,
        courseName: lesson.courseName || c.name,
        courses: lesson.courses || { id: c.id, name: c.name },
        subjects:
          lesson.subjects ||
          (subObj ? { id: subObj.id, name: subObj.name } : null),
      };
    }

    return {
      ...lesson,
      subjects:
        lesson.subjects ||
        (subObj ? { id: subObj.id, name: subObj.name } : null),
    };
  });
});

const groupedLessons = computed(() => {
  const groups: Record<string, Lesson[]> = {};
  displayLessons.value.forEach((lesson) => {
    const key = `${lesson.day}-${lesson.slot}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(lesson);
  });
  return groups;
});

const coveredSlots = computed(() => {
  const set = new Set<string>();
  (props.lessons || []).forEach((lesson) => {
    const d = Number(lesson.day);
    const s = Number(lesson.slot);
    const dur = Math.max(1, Number(lesson.duration || 1));
    for (let i = 0; i < dur; i++) {
      set.add(`${d}-${s + i}`);
    }
  });
  return set;
});

const onSelectLesson = (lesson: Lesson, event?: MouseEvent) => {
  emit('select-lesson', lesson, event);
};

const onSelectDay = (day: number, event?: MouseEvent) => {
  if (props.isEditable) {
    emit('select-day', day, event);
  }
};

const scrollContainerRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);

const { width: windowWidth } = useWindowSize();

const { syncedRowHeights, syncRowHeights } =
  useScheduleRowSync(daysGridWrapperRef);

const scrollToDefaultDay = () => {
  if (!scrollContainerRef.value || windowWidth.value > 500) return;
  const dayIndex = defaultDayIndex.value;
  const dayHeaders = scrollContainerRef.value.querySelectorAll('.day-header');
  if (dayHeaders[dayIndex]) {
    const header = dayHeaders[dayIndex] as HTMLElement;
    scrollContainerRef.value.scrollTo({
      left: header.offsetLeft,
      behavior: 'auto',
    });
  }
};

onMounted(() => {
  nextTick(() => {
    syncRowHeights();
    requestAnimationFrame(syncRowHeights);
    setTimeout(syncRowHeights, 100);
    scrollToDefaultDay();
  });
});
</script>

<template>
  <BaseTableWrapper class="max-[500px]:overflow-visible">
    <div
      class="grid grid-cols-[80px_repeat(5,1fr)] grid-rows-[auto_repeat(9,auto)] gap-2 items-stretch max-[500px]:flex max-[500px]:overflow-hidden max-[500px]:grid-cols-none max-[500px]:grid-rows-none"
    >
      <ScheduleTimeColumn
        :time-slots="effectiveTimeSlots"
        :animated="animated"
        :grid-template-rows="syncedRowHeights"
      />

      <div
        ref="scrollContainerRef"
        class="max-[500px]:block max-[500px]:relative max-[500px]:overflow-x-auto max-[500px]:overflow-y-hidden max-[500px]:snap-x max-[500px]:snap-mandatory max-[500px]:flex-1 max-[500px]:overscroll-x-none max-[500px]:h-full max-[500px]:[scrollbar-width:none] min-[501px]:contents [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref="daysGridWrapperRef"
          class="max-[500px]:grid max-[500px]:grid-cols-[repeat(5,100%)] max-[500px]:gap-2 min-[501px]:contents"
          :style="
            windowWidth < 501
              ? {
                  gridTemplateRows: `auto repeat(${effectiveTimeSlots.length || 9}, minmax(58px, auto))`,
                }
              : {}
          "
        >
          <div
            v-for="day in days"
            :key="day"
            class="day-header bg-surface text-on-ghost p-2 border border-ghost-border text-center font-bold rounded-md max-[500px]:rounded-lg text-base shadow-input min-w-[150px] min-[501px]:[grid-row:1] max-[500px]:snap-start max-[500px]:scroll-ml-0"
            :class="[
              isEditable
                ? 'cursor-pointer hover:bg-surface-highlight select-none transition-colors'
                : '',
            ]"
            @click.stop="onSelectDay(day, $event)"
          >
            {{ formatDayName(day) }}
          </div>

          <ScheduleLessonGroup
            v-for="(group, key) in groupedLessons"
            :key="key"
            :group="group"
            :group-key="String(key)"
            :is-clickable="true"
            :selected-lesson-id="selectedLessonId"
            :selected-lesson-ids="selectedLessonIds"
            :animated="animated"
            :get-display-name="getDisplayName"
            :get-group-style="getGroupStyle"
            @select-lesson="onSelectLesson"
            @contextmenu-lesson="(l, ev) => emit('contextmenu-lesson', l, ev)"
          />

          <template v-if="isEditable">
            <template v-for="day in days" :key="`empty-day-${day}`">
              <template
                v-for="ts in effectiveTimeSlots"
                :key="`empty-${day}-${ts.slot}`"
              >
                <button
                  v-if="!coveredSlots.has(`${day}-${ts.slot}`)"
                  type="button"
                  class="min-h-[54px] border border-dashed border-ghost-border hover:border-action/50 hover:bg-action/5 rounded-xl transition-all flex items-center justify-center group cursor-pointer"
                  :style="{
                    '--col-desktop': `${day + 1} / span 1`,
                    '--col-mobile': `${day} / span 1`,
                    gridRow: `${ts.slot + 1} / span 1`,
                  }"
                  :class="[
                    'min-[501px]:[grid-column:var(--col-desktop)]',
                    'max-[500px]:![grid-column:var(--col-mobile)]',
                  ]"
                  @click.stop="emit('add-lesson', { day, slot: ts.slot })"
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
      </div>
    </div>
  </BaseTableWrapper>
</template>
