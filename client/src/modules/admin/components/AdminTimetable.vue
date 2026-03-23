<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Lesson } from '@/modules/schedule/types';
import { useI18n } from 'vue-i18n';
import { useTimetable } from '@/modules/schedule/composables/useTimetable';

const { t } = useI18n();
const { formatDayName, days, timeSlots, getGroupStyle, getDisplayName, defaultDayIndex } = useTimetable({ autoLoad: false });

const props = defineProps<{
  lessons: Lesson[];
  selectedLessonId?: string;
}>();

const emit = defineEmits<{
  (e: 'select-lesson', lesson: Lesson): void;
}>();

const groupedLessons = computed(() => {
  const groups: Record<string, Lesson[]> = {};
  props.lessons.forEach(lesson => {
    const key = `${lesson.day}-${lesson.slot}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(lesson);
  });
  return groups;
});

const onSelectLesson = (lesson: Lesson) => {
  emit('select-lesson', lesson);
};

// Responsiveness logic (same as Timetable.vue)
const scrollContainerRef = ref<HTMLElement | null>(null);
const timeColWrapperRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const scrollToDefaultDay = () => {
  if (!scrollContainerRef.value) return;
  if (window.innerWidth <= 500) {
    const dayIndex = defaultDayIndex.value;
    const dayHeaders = scrollContainerRef.value.querySelectorAll('.day-header');
    if (dayHeaders && dayHeaders[dayIndex]) {
      const header = dayHeaders[dayIndex] as HTMLElement;
      scrollContainerRef.value.scrollTo({
        left: header.offsetLeft,
        behavior: 'auto'
      });
    }
  }
};

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

const handleResize = () => {
  scrollToDefaultDay();
  syncRowHeights();
};

onMounted(() => {
  setTimeout(() => {
    syncRowHeights();
    scrollToDefaultDay();
  }, 100);
  window.addEventListener('resize', handleResize);
  resizeObserver = new ResizeObserver(() => syncRowHeights());
  if (daysGridWrapperRef.value) resizeObserver.observe(daysGridWrapperRef.value);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<template>
  <div class="admin-timetable-wrapper">
    <div class="timetable-grid">
      <div class="time-col-wrapper" ref="timeColWrapperRef">
        <div class="header-cell time-header">{{ t('school.tables.timetable.lesson') }}</div>
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

      <div class="days-scroll-wrapper" ref="scrollContainerRef">
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
                :class="{ 
                  'has-border': index < group.length - 1,
                  'selected': lesson.id === selectedLessonId 
                }"
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
  </div>
</template>

<style scoped>
.admin-timetable-wrapper {
  overflow-x: auto;
  width: 100%;
  -webkit-overflow-scrolling: touch;
}

.timetable-grid {
  display: grid;
  grid-template-columns: 80px repeat(5, 1fr);
  grid-template-rows: auto repeat(9, auto);
  gap: 8px;
  align-items: stretch;
}

.header-cell {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  padding: 8px 12px;
  border: 1px solid var(--color-surface-border);
  text-align: center;
  font-weight: bold;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-input);
  font-size: var(--text-body);
}

.time-header { grid-column: 1; grid-row: 1; }
.day-header { grid-row: 1; min-width: 150px; }

.time-slot-label {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--color-on-surface-muted);
  font-size: var(--text-sub);
}

.slot-number {
  font-weight: bold;
  color: var(--color-on-surface);
  font-size: var(--text-title);
}

.slot-time { font-size: var(--text-footnote); }

.lesson-group-container {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-surface-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-input);
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
  background-color: var(--color-surface-hover);
}

.sub-lesson-item.has-border {
  border-bottom: 1px solid var(--color-surface-border);
}

.sub-lesson-item.selected {
  background-color: var(--color-on-surface);
}
.sub-lesson-item.selected .lesson-subject {
  color: var(--color-canvas);
}
.sub-lesson-item.selected .lesson-details {
  color: var(--color-surface-hover);
}

.lesson-subject {
  font-weight: bold;
  color: var(--color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-body);
}

.lesson-details {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  margin-top: 2px;
}

@media (max-width: 500px) {
  .admin-timetable-wrapper {
    overflow-x: visible;
  }

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
    position: relative;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    flex: 1;
    overscroll-behavior-x: none;
    -webkit-overflow-scrolling: touch;
    height: 100%;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .days-scroll-wrapper::-webkit-scrollbar {
    display: none;
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
