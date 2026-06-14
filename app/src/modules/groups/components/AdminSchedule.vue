<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useResizeObserver, useWindowSize } from '@vueuse/core';
import type { Lesson } from '@/modules/schedule/types';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';

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

const props = defineProps<{
  lessons: Lesson[];
  selectedLessonId?: string;
}>();

const emit = defineEmits<{
  (e: 'select-lesson', lesson: Lesson): void;
}>();

const groupedLessons = computed(() => {
  const groups: Record<string, Lesson[]> = {};
  props.lessons.forEach((lesson) => {
    const key = `${lesson.day}-${lesson.slot}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(lesson);
  });
  return groups;
});

const onSelectLesson = (lesson: Lesson) => {
  emit('select-lesson', lesson);
};

const scrollContainerRef = ref<HTMLElement | null>(null);
const timeColWrapperRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);

const { width: windowWidth } = useWindowSize();

const syncRowHeights = () => {
  if (windowWidth.value >= 501) {
    if (timeColWrapperRef.value) {
      timeColWrapperRef.value.style.gridTemplateRows = '';
    }
    return;
  }
  if (daysGridWrapperRef.value && timeColWrapperRef.value) {
    const styles = window.getComputedStyle(daysGridWrapperRef.value);
    timeColWrapperRef.value.style.gridTemplateRows = styles.gridTemplateRows;
  }
};

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

useResizeObserver(daysGridWrapperRef, syncRowHeights);

onMounted(() => {
  setTimeout(() => {
    syncRowHeights();
    scrollToDefaultDay();
  }, 100);
});
</script>

<template>
  <div
    class="overflow-x-auto w-full max-[500px]:overflow-visible [webkit-overflow-scrolling:touch]"
  >
    <div
      class="grid grid-cols-[80px_repeat(5,1fr)] grid-rows-[auto_repeat(9,auto)] gap-2 items-stretch max-[500px]:flex max-[500px]:overflow-hidden max-[500px]:grid-cols-none max-[500px]:grid-rows-none"
    >
      <div ref="timeColWrapperRef" class="min-[501px]:contents">
        <ScheduleTimeColumn :time-slots="timeSlots" />
      </div>

      <div
        ref="scrollContainerRef"
        class="max-[500px]:block max-[500px]:relative max-[500px]:overflow-x-auto max-[500px]:overflow-y-hidden max-[500px]:snap-x max-[500px]:snap-mandatory max-[500px]:flex-1 max-[500px]:overscroll-x-none max-[500px]:h-full max-[500px]:[scrollbar-width:none] min-[501px]:contents [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref="daysGridWrapperRef"
          class="max-[500px]:grid max-[500px]:grid-cols-[repeat(5,100%)] max-[500px]:grid-rows-[auto_repeat(9,minmax(35px,auto))] max-[500px]:gap-2 min-[501px]:contents"
        >
          <div
            v-for="day in days"
            :key="day"
            class="day-header bg-surface text-on-ghost p-2 border border-surface-border text-center font-bold rounded-md text-base shadow-input min-w-[150px] min-[501px]:[grid-row:1] max-[500px]:snap-start max-[500px]:scroll-ml-0"
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
            :get-display-name="getDisplayName"
            :get-group-style="getGroupStyle"
            @select-lesson="onSelectLesson"
          />
        </div>
      </div>
    </div>
  </div>
</template>
