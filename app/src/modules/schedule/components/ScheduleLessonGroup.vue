<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Clock, Plus } from '@lucide/vue';
import ScheduleLessonItem from './ScheduleLessonItem.vue';
import type { Lesson } from '@/modules/schedule/types';
import { lessonsSlotRange } from '@/modules/schedule/utils/lesson';

const props = withDefaults(
  defineProps<{
    group: Lesson[];
    isActive?: boolean;
    /** Every lesson of the cell, or only those the predicate accepts. */
    isClickable?: boolean | ((lesson: Lesson) => boolean);
    hasContextMenu?: boolean;
    /** Matches a lesson by its own id or the id it was expanded from. */
    selectedLessonIds?: ReadonlySet<string>;
    animated?: boolean;
    canAddLesson?: boolean;
    /** When the cell takes place, for a day whose times differ from the rows'. */
    time?: string | null;
    getDisplayName: (lesson: Lesson) => string;
  }>(),
  {
    time: null,
    isActive: false,
    isClickable: false,
    hasContextMenu: false,
    selectedLessonIds: undefined,
    animated: true,
    canAddLesson: false,
  },
);

const emit = defineEmits<{
  (e: 'select-lesson', lesson: Lesson, event?: MouseEvent): void;
  (e: 'contextmenu-lesson', lesson: Lesson, event: UIEvent): void;
  (e: 'add-lesson'): void;
}>();

const { t } = useI18n();

const groupRange = computed(() => lessonsSlotRange(props.group));

const isLessonClickable = (lesson: Lesson) =>
  typeof props.isClickable === 'function'
    ? props.isClickable(lesson)
    : props.isClickable;

const isLessonSelected = (lesson: Lesson) =>
  !!props.selectedLessonIds &&
  (props.selectedLessonIds.has(lesson.id) ||
    (!!lesson._originalId && props.selectedLessonIds.has(lesson._originalId)));

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
      isActive ? 'highlight-active bg-action! border-action!' : '',
    ]"
  >
    <span
      v-if="time"
      class="flex items-center gap-1 px-2 max-xs:px-2.5 pt-1 text-xs font-medium tabular-nums text-on-ghost-muted group-[.highlight-active]:text-on-action-muted!"
    >
      <Clock :size="12" aria-hidden="true" />
      {{ time }}
    </span>

    <ScheduleLessonItem
      v-for="(lesson, index) in group"
      :key="index"
      :lesson="lesson"
      :has-border="index < group.length - 1"
      :period-label="periodLabel(lesson)"
      :is-clickable="isLessonClickable(lesson)"
      :has-context-menu="hasContextMenu"
      :is-selected="isLessonSelected(lesson)"
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
