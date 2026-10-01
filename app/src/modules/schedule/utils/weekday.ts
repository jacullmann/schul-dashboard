/** January 2024 starts on a Monday, so its first days line up with ours. */
const MONDAY_BASED_YEAR = 2024;

/** The days a schedule shows, numbered from Monday = 1. */
export const SCHOOL_DAYS: readonly number[] = [1, 2, 3, 4, 5];

/** How far into the week a date lies, from Monday = 0 to Sunday = 6. */
export function daysSinceMonday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** The locale's name for a school day numbered from Monday = 1. */
export function formatWeekday(
  day: number,
  locale: string,
  weekday: 'long' | 'short' = 'long',
): string {
  const date = new Date(Date.UTC(MONDAY_BASED_YEAR, 0, day, 12));
  return new Intl.DateTimeFormat(locale, { weekday }).format(date);
}
