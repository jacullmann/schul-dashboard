import { computed, ref, type Ref } from 'vue';
import type { ScheduleBreaks, ScheduleConfig } from '@/modules/schedule/types';
import {
  breaksOn,
  withBreaksOn,
  withTidyBreaks,
} from '@/modules/schedule/utils/breaks';
import { DEFAULT_SCHEDULE_CONFIG } from '@/modules/schedule/utils/slotTimes';
import { SCHOOL_DAYS } from '@/modules/schedule/utils/weekday';

export const MAX_SLOTS = 15;
export const DEFAULT_BREAK_MINS = 15;

interface ScheduleConfigForm {
  startTime: string;
  /** Blank while being retyped. */
  totalSlots: number | '';
  lessonDurationMins: number | '';
  breaks: ScheduleBreaks;
  dayBreaks: ScheduleConfig['dayBreaks'];
}

const formOf = (config: ScheduleConfig): ScheduleConfigForm => ({
  ...config,
  dayBreaks: { ...config.dayBreaks },
});

function withoutBreakAfter(
  breaks: ScheduleBreaks,
  slot: number,
): ScheduleBreaks {
  return Object.fromEntries(
    Object.entries(breaks).filter(([breakSlot]) => Number(breakSlot) !== slot),
  );
}

/**
 * The configuration being edited, with the breaks of one day or, as `null`,
 * everyone's breaks on show. Changing the breaks shown changes only theirs.
 */
export function useScheduleConfigForm(saved: Ref<ScheduleConfig>) {
  const form = ref<ScheduleConfigForm>(formOf(saved.value));
  const shownDay = ref<number | null>(null);

  function reset() {
    form.value = formOf(saved.value);
    shownDay.value = null;
  }

  /** The form as the server stores it, a blank field read as its default. */
  const draftConfig = computed<ScheduleConfig>(() =>
    withTidyBreaks({
      startTime: form.value.startTime,
      totalSlots: Math.min(
        Math.max(Number(form.value.totalSlots) || 1, 1),
        MAX_SLOTS,
      ),
      lessonDurationMins:
        Number(form.value.lessonDurationMins) ||
        DEFAULT_SCHEDULE_CONFIG.lessonDurationMins,
      breaks: form.value.breaks,
      dayBreaks: form.value.dayBreaks,
    }),
  );

  const daysWithOwnBreaks = computed(() =>
    SCHOOL_DAYS.filter((day) => draftConfig.value.dayBreaks[day]),
  );

  const shownBreaks = computed(() =>
    shownDay.value === null
      ? draftConfig.value.breaks
      : breaksOn(draftConfig.value, shownDay.value),
  );

  function setBreaksOn(day: number | null, breaks: ScheduleBreaks) {
    const { breaks: everyones, dayBreaks } = withBreaksOn(
      draftConfig.value,
      day,
      breaks,
    );
    form.value = { ...form.value, breaks: everyones, dayBreaks };
  }

  const setShownBreaks = (breaks: ScheduleBreaks) =>
    setBreaksOn(shownDay.value, breaks);

  const addBreak = (afterSlot: number) =>
    setShownBreaks({ ...shownBreaks.value, [afterSlot]: DEFAULT_BREAK_MINS });

  const setBreakMinutes = (afterSlot: number, minutes: number) =>
    setShownBreaks({ ...shownBreaks.value, [afterSlot]: minutes });

  const removeBreak = (afterSlot: number) =>
    setShownBreaks(withoutBreakAfter(shownBreaks.value, afterSlot));

  function moveBreak(afterSlot: number, toSlot: number) {
    const minutes = shownBreaks.value[afterSlot];
    if (minutes === undefined) return;
    setShownBreaks({
      ...withoutBreakAfter(shownBreaks.value, afterSlot),
      [toSlot]: minutes,
    });
  }

  const resetBreaksOn = (day: number) =>
    setBreaksOn(day, draftConfig.value.breaks);

  return {
    form,
    shownDay,
    draftConfig,
    daysWithOwnBreaks,
    shownBreaks,
    reset,
    addBreak,
    setBreakMinutes,
    removeBreak,
    moveBreak,
    resetBreaksOn,
  };
}
