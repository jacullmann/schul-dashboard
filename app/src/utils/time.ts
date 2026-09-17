/** Fallback used whenever a group has no configured schedule start. */
export const DEFAULT_START_TIME = '08:00';

export interface TimeOfDay {
  hour: number;
  minute: number;
}

/**
 * Parses an `HH:MM` string. Malformed or missing parts fall back to
 * {@link DEFAULT_START_TIME} so a bad config never yields NaN minutes.
 */
export function parseTimeOfDay(time: string | null | undefined): TimeOfDay {
  const [hour, minute] = (time || DEFAULT_START_TIME).split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? (hour as number) : 8,
    minute: Number.isFinite(minute) ? (minute as number) : 0,
  };
}

/** Minutes elapsed since midnight for an `HH:MM` string. */
export function minutesSinceMidnight(time: string | null | undefined): number {
  const { hour, minute } = parseTimeOfDay(time);
  return hour * 60 + minute;
}
