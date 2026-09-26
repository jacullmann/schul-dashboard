/** January 2024 starts on a Monday, so its first days line up with ours. */
const MONDAY_BASED_YEAR = 2024;

/** The locale's name for a school day numbered from Monday = 1. */
export function formatWeekday(
  day: number,
  locale: string,
  weekday: 'long' | 'short' = 'long',
): string {
  const date = new Date(Date.UTC(MONDAY_BASED_YEAR, 0, day, 12));
  return new Intl.DateTimeFormat(locale, { weekday }).format(date);
}
