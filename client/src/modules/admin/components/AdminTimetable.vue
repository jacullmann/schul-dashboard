<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Lesson, TimeSlot } from '@/modules/schedule/types';

const props = defineProps<{
  lessons: Lesson[];
}>();

const emit = defineEmits<{
  (e: 'select-lesson', lesson: Lesson): void;
}>();

const days = [1, 2, 3, 4, 5];
const totalSlots = 9;
const lessonDurationMins = 45;
const startTimeHour = 8;
const startTimeMinute = 0;

const breaks: Record<number, number> = {
  2: 25,
  3: 5,
  5: 40,
  7: 10
};

const formatTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const slotStartMinutes = computed(() => {
  const map: Record<number, number> = {};
  let currentMetrics = (startTimeHour * 60) + startTimeMinute;
  for (let i = 1; i <= totalSlots; i++) {
    map[i] = currentMetrics;
    const breakTime = breaks[i] || 0;
    currentMetrics += lessonDurationMins + breakTime;
  }
  return map;
});

const timeSlots = computed<TimeSlot[]>(() => {
  const slots: TimeSlot[] = [];
  for (let i = 1; i <= totalSlots; i++) {
    const startMins = slotStartMinutes.value[i] ?? 0;
    const endMins = startMins + lessonDurationMins;
    slots.push({ slot: i, time: `${formatTime(startMins)} - ${formatTime(endMins)}` });
  }
  return slots;
});

const groupedLessons = computed(() => {
  const groups: Record<string, Lesson[]> = {};
  props.lessons.forEach(lesson => {
    const key = `${lesson.day}-${lesson.slot}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(lesson);
  });
  return groups;
});

const getGroupStyle = (groupLessons: Lesson[]) => {
  if (!groupLessons.length) return {};
  const firstLesson = groupLessons[0];
  if (!firstLesson) return {};
  const maxDuration = Math.max(...groupLessons.map(l => l.duration));
  const dayIndex = days.indexOf(firstLesson.day);
  const colStart = dayIndex + 2;
  const rowStart = firstLesson.slot + 1;
  return {
    '--col-desktop': `${colStart} / span 1`,
    '--col-mobile': `${colStart - 1} / span 1`,
    gridColumn: `var(--col-desktop)`,
    gridRow: `${rowStart} / span ${maxDuration}`
  } as Record<string, string>;
};

const formatDayName = (day: number): string => {
  const date = new Date(Date.UTC(2024, 0, day, 12));
  return new Intl.DateTimeFormat('de', { weekday: 'long' }).format(date);
};

const getDisplayName = (lesson: Lesson): string => {
  const subjectName = lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
  return subjectName ? subjectName : 'Unbekannt';
};

const onSelectLesson = (lesson: Lesson) => {
  emit('select-lesson', lesson);
};

// Responsiveness logic (same as Timetable.vue)
const timeColWrapperRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const syncRowHeights = () => {
  if (window.innerWidth >= 501) {
    if (timeColWrapperRef.value) {
      timeColWrapperRef.value.style.gridTemplateRows = '';
    }
    return;
  }
  if (daysGridWrapperRef.value && timeColWrapperRef.value) {
    const computed = window.getComputedStyle(daysGridWrapperRef.value);
    timeColWrapperRef.value.style.gridTemplateRows = computed.gridTemplateRows;
  }
};

onMounted(() => {
  setTimeout(() => {
    syncRowHeights();
  }, 100);
  window.addEventListener('resize', syncRowHeights);
  resizeObserver = new ResizeObserver(() => syncRowHeights());
  if (daysGridWrapperRef.value) resizeObserver.observe(daysGridWrapperRef.value);
});

onUnmounted(() => {
  window.removeEventListener('resize', syncRowHeights);
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<template>
  <div class="timetable-grid">
    <div class="time-col-wrapper" ref="timeColWrapperRef">
      <div class="header-cell time-header">Std.</div>
      <div
          v-for="ts in timeSlots"
          :key="ts.slot"
          class="time-slot-label"
          :style="{ gridRow: ts.slot + 1 }"
      >
        <span class="slot-number">{{ ts.slot }}</span>
        <span class="slot-time">{{ ts.time }}</span>
      </div>
    </div>

    <div class="days-scroll-wrapper">
      <div class="days-grid-wrapper" ref="daysGridWrapperRef">
        <div
            v-for="day in days"
            :key="day"
            class="header-cell day-header"
        >
          {{ formatDayName(day) }}
        </div>

        <div
            v-for="(group, key) in groupedLessons"
            :key="key"
            class="lesson-group-container"
            :style="getGroupStyle(group)"
        >
          <div
              v-for="(lesson, index) in group"
              :key="index"
              class="sub-lesson-item clickable"
              @click="onSelectLesson(lesson)"
              :class="{ 'has-border': index < group.length - 1 }"
          >
            <div class="lesson-subject">
              {{ getDisplayName(lesson) }}
            </div>
            <div class="lesson-details">
               <span class="detail-group">
                 {{ lesson.room || '-' }}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timetable-grid {
  display: grid;
  grid-template-columns: 80px repeat(5, 1fr);
  grid-template-rows: auto repeat(9, auto);
  gap: 8px;
  align-items: stretch;
}

.header-cell {
  background-color: var(--bg-surface);
  color: var(--text-default);
  padding: 10px 12px;
  border: 1px solid var(--border-surface);
  text-align: center;
  font-weight: bold;
  border-radius: var(--border-radius-md);
  box-shadow: var(--input-shadow);
  font-size: var(--font-size-body);
}

.time-header { grid-column: 1; grid-row: 1; }
.day-header { grid-row: 1; min-width: 150px; }

.time-slot-label {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--sub);
  font-size: var(--font-size-sub);
}

.slot-number {
  font-weight: bold;
  color: var(--text-default);
  font-size: var(--font-size-title);
}

.slot-time { font-size: var(--font-size-footnote); }

.lesson-group-container {
  background-color: var(--bg-surface);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--input-shadow);
}

.sub-lesson-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 8px;
}

.sub-lesson-item.clickable {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.sub-lesson-item.clickable:hover {
  background-color: var(--bg-interactive-hover);
}

.sub-lesson-item.has-border {
  border-bottom: 1px solid var(--border-surface);
}

.lesson-subject {
  font-weight: bold;
  color: var(--text-default);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-size-body);
}

.lesson-details {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin-top: 2px;
}

@media (max-width: 500px) {
  .timetable-grid {
    display: flex;
    overflow: hidden;
    grid-template-columns: none;
    grid-template-rows: none;
    gap: 8px;
  }
  .time-col-wrapper {
    display: grid;
    grid-template-rows: auto repeat(9, auto);
    width: 80px;
    flex-shrink: 0;
    gap: 8px;
  }
  .header-cell.time-header,
  .time-slot-label {
    position: static;
  }
  .days-scroll-wrapper {
    display: block;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    flex: 1;
    scrollbar-width: none;
  }
  .days-grid-wrapper {
    display: grid;
    grid-template-columns: repeat(5, 100%);
    grid-template-rows: auto repeat(9, minmax(35px, auto));
    gap: 8px;
  }
  .header-cell.day-header,
  .lesson-group-container {
    scroll-snap-align: start;
  }
  .lesson-group-container {
    grid-column: var(--col-mobile) !important;
  }
}
@media (min-width: 501px) {
  .time-col-wrapper,
  .days-scroll-wrapper,
  .days-grid-wrapper {
    display: contents;
  }
  .lesson-group-container {
    grid-column: var(--col-desktop) !important;
  }
}
</style>
