<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@lucide/vue';
import ScheduleLessonItem from './ScheduleLessonItem.vue';
import type { Lesson } from '@/modules/schedule/types';
import { lessonsSlotRange } from '@/modules/schedule/utils/lesson';

const props = withDefaults(
  defineProps<{
    group: any[];
    groupKey: string;
    isActive?: boolean;
    isCurrentDay?: boolean;
    isClickable?: boolean;
    hasContextMenu?: boolean;
    selectedLessonId?: string;
    selectedLessonIds?: string[];
    dayIndex?: number;
    elapsedLoadTime?: number;
    animated?: boolean;
    canAddLesson?: boolean;
    getDisplayName: (l: any) => string;
    getGroupStyle: (g: any[]) => any;
  }>(),
  {
    animated: true,
    hasContextMenu: false,
    canAddLesson: false,
    selectedLessonId: undefined,
    selectedLessonIds: () => [],
    dayIndex: undefined,
    elapsedLoadTime: 0,
  },
);

const emit = defineEmits<{
  (e: 'select-lesson', lesson: any, event?: MouseEvent): void;
  (e: 'contextmenu-lesson', lesson: any, event: UIEvent): void;
  (e: 'add-lesson'): void;
}>();

const { t } = useI18n();

const groupRange = computed(() => lessonsSlotRange(props.group));

/*
 * A lesson filling only part of the cell's slots names its own, since the
 * cell's height no longer tells when it takes place.
 */
const periodLabel = (lesson: Lesson) => {
  const { firstSlot, lastSlot } = lessonsSlotRange([lesson]);
  if (
    firstSlot === groupRange.value.firstSlot &&
    lastSlot === groupRange.value.lastSlot
  ) {
    return undefined;
  }
  return firstSlot === lastSlot
    ? t('schedule.period', { slot: firstSlot })
    : t('schedule.periods', { first: firstSlot, last: lastSlot });
};
</script>

<template>
  <div
    class="group bg-surface rounded-md max-xs:rounded-lg border border-ghost-border flex flex-col overflow-hidden z-[2] shadow-input"
    :class="[
      animated ? 'animate-enter' : '',
      isActive
        ? 'highlight-active bg-action! border-action!'
        : isCurrentDay
          ? 'current-day xs:border-surface-hover-border xs:bg-linear-to-b xs:from-ghost-border xs:to-ghost-border'
          : '',
      'xs:[grid-column:var(--col-desktop)]',
      'max-xs:![grid-column:var(--col-mobile)] max-xs:[scroll-snap-align:start] max-xs:[scroll-margin-left:0]',
    ]"
    :style="getGroupStyle(group)"
  >
    <ScheduleLessonItem
      v-for="(lesson, index) in group"
      :key="index"
      :lesson="lesson"
      :has-border="index < group.length - 1"
      :period-label="periodLabel(lesson)"
      :is-clickable="isClickable"
      :has-context-menu="hasContextMenu"
      :is-selected="
        (Boolean(selectedLessonId) &&
          (selectedLessonId === lesson.id ||
            selectedLessonId === lesson._originalId)) ||
        (Boolean(selectedLessonIds) &&
          (selectedLessonIds.includes(lesson.id) ||
            (Boolean(lesson._originalId) &&
              selectedLessonIds.includes(lesson._originalId))))
      "
      :get-display-name="getDisplayName"
      @select="(l, ev) => emit('select-lesson', l, ev)"
      @contextmenu="(l, ev) => emit('contextmenu-lesson', l, ev)"
    />

    <!-- Courses of a year run in parallel, so a taken slot still takes more. -->
    <button
      v-if="canAddLesson"
      type="button"
      class="flex items-center justify-center gap-1 py-1 border-t border-dashed border-ghost-border text-on-ghost-muted hover:text-action hover:bg-action/5 transition-colors cursor-pointer"
      @click.stop="emit('add-lesson')"
    >
      <Plus :size="16" />
    </button>
  </div>
</template>
