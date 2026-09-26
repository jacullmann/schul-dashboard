import type {
  Lesson,
  ScheduleConfig,
  TimeSlot,
} from '@/modules/schedule/types';
import { lessonSpan } from '@/modules/schedule/utils/lesson';
import {
  DEFAULT_START_TIME,
  formatTimeOfDay,
  minutesSinceMidnight,
} from '@/utils/time';

/** What a group without a configured schedule gets. */
export const DEFAULT_SCHEDULE_CONFIG: Readonly<ScheduleConfig> = {
  startTime: DEFAULT_START_TIME,
  totalSlots: 9,
  lessonDurationMins: 45,
  breaks: { 2: 25, 3: 5, 5: 40, 7: 10 },
};

export function scheduleConfigOrDefault(
  config: Partial<ScheduleConfig> | null | undefined,
): ScheduleConfig {
  return {
    startTime: config?.startTime ?? DEFAULT_SCHEDULE_CONFIG.startTime,
    totalSlots: config?.totalSlots ?? DEFAULT_SCHEDULE_CONFIG.totalSlots,
    lessonDurationMins:
      config?.lessonDurationMins ?? DEFAULT_SCHEDULE_CONFIG.lessonDurationMins,
    breaks: config?.breaks ?? DEFAULT_SCHEDULE_CONFIG.breaks,
  };
}

/** When a slot starts, in minutes since midnight, after every lesson and break before it. */
export function slotStartMinutes(config: ScheduleConfig, slot: number): number {
  let minutes = minutesSinceMidnight(config.startTime);
  for (let earlierSlot = 1; earlierSlot < slot; earlierSlot++) {
    minutes += config.lessonDurationMins + (config.breaks[earlierSlot] || 0);
  }
  return minutes;
}

export interface MinuteRange {
  start: number;
  end: number;
}

/** From the start of the first slot to the end of the last, breaks between them included. */
export function slotRangeMinutes(
  config: ScheduleConfig,
  firstSlot: number,
  lastSlot = firstSlot,
): MinuteRange {
  return {
    start: slotStartMinutes(config, firstSlot),
    end: slotStartMinutes(config, lastSlot) + config.lessonDurationMins,
  };
}

export function lessonMinutes(
  config: ScheduleConfig,
  lesson: Pick<Lesson, 'slot'> & { duration?: number | null },
): MinuteRange {
  return slotRangeMinutes(
    config,
    lesson.slot,
    lesson.slot + lessonSpan(lesson) - 1,
  );
}

export function formatMinuteRange({ start, end }: MinuteRange): string {
  return `${formatTimeOfDay(start)} - ${formatTimeOfDay(end)}`;
}

export function timeSlotsOf(config: ScheduleConfig): TimeSlot[] {
  return Array.from({ length: config.totalSlots }, (_, index) => {
    const slot = index + 1;
    const range = slotRangeMinutes(config, slot);
    return {
      slot,
      time: formatMinuteRange(range),
      startTime: formatTimeOfDay(range.start),
    };
  });
}
