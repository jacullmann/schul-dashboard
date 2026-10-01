import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type { Lesson } from '@/modules/schedule/types';
import {
  lessonDisplayName,
  lessonsSlotRange,
} from '@/modules/schedule/utils/lesson';
import {
  scheduleConfigOrDefault,
  timeSlotsOf,
} from '@/modules/schedule/utils/slotTimes';
import { SCHOOL_DAYS, formatWeekday } from '@/modules/schedule/utils/weekday';

export function buildGroupStyle(
  groupLessons: Lesson[],
  rowOfSlot: (slot: number) => number,
  mobileColumn: (desktopColumn: number) => number,
): Record<string, string> {
  const firstLesson = groupLessons[0];
  if (!firstLesson) return {};
  const { firstSlot, lastSlot } = lessonsSlotRange(groupLessons);
  const colStart = SCHOOL_DAYS.indexOf(firstLesson.day) + 2;
  const rowStart = rowOfSlot(firstSlot);
  const rowEnd = rowOfSlot(lastSlot) + 1;
  const minHeight = Math.max(58, groupLessons.length * 54);
  return {
    '--col-desktop': `${colStart} / span 1`,
    '--col-mobile': `${mobileColumn(colStart)} / span 1`,
    gridColumn: `var(--col-desktop)`,
    gridRow: `${rowStart} / ${rowEnd}`,
    minHeight: `${minHeight}px`,
  };
}

/** What every schedule view needs to lay out and label lessons, without loading any. */
export function useScheduleDisplay() {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const te = (key: string) => i18n.te(key);
  const { activeScheduleConfig } = useAppAuth();

  const scheduleConfig = computed(() =>
    scheduleConfigOrDefault(activeScheduleConfig.value),
  );

  const timeSlots = computed(() => timeSlotsOf(scheduleConfig.value));

  const formatDayName = (day: number, weekday: 'long' | 'short' = 'long') =>
    formatWeekday(day, locale.value, weekday);

  const getDisplayName = (lesson: Lesson): string =>
    lessonDisplayName(lesson, t, te);

  const getGroupStyle = (groupLessons: Lesson[]) =>
    buildGroupStyle(
      groupLessons,
      (slot) => slot + 1,
      (column) => column - 1,
    );

  return {
    days: SCHOOL_DAYS,
    scheduleConfig,
    timeSlots,
    formatDayName,
    getDisplayName,
    getGroupStyle,
  };
}
