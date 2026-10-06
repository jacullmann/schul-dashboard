const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const MONDAY = 1;
const DAY_BEFORE_YESTERDAY_OFFSET = 2;

/** The part of the list a task falls into by when it is due. */
export type DueSection =
  | {
      kind:
        | 'last_week'
        | 'yesterday'
        | 'today'
        | 'tomorrow'
        | 'this_week'
        | 'next_week';
    }
  | { kind: 'month'; year: number; month: number };

type WeekInfo = { firstDay: number };
type LocaleWithWeekInfo = Intl.Locale & {
  getWeekInfo?: () => WeekInfo;
  weekInfo?: WeekInfo;
};

/** 0 for Sunday through 6 for Saturday, falling back to Monday. */
export function firstDayOfWeek(locale: string): number {
  const intlLocale = new Intl.Locale(locale) as LocaleWithWeekInfo;
  const weekInfo = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
  return (weekInfo?.firstDay ?? MONDAY) % DAYS_PER_WEEK;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Rounded, as a day across a daylight saving change is an hour short or long.
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY,
  );
}

export function dueSectionOf(
  dueDate: Date,
  now: Date,
  weekStart: number,
): DueSection {
  const daysAhead = calendarDaysBetween(now, dueDate);
  if (daysAhead === 0) return { kind: 'today' };
  if (daysAhead === 1) return { kind: 'tomorrow' };
  if (daysAhead === -1) return { kind: 'yesterday' };

  // Anchored on the day before yesterday, so on a Monday it is still last week.
  const daysIntoAnchorWeek =
    (now.getDay() -
      DAY_BEFORE_YESTERDAY_OFFSET -
      weekStart +
      2 * DAYS_PER_WEEK) %
    DAYS_PER_WEEK;
  if (
    daysAhead <= -DAY_BEFORE_YESTERDAY_OFFSET &&
    daysAhead >= -DAY_BEFORE_YESTERDAY_OFFSET - daysIntoAnchorWeek
  ) {
    return { kind: 'last_week' };
  }

  const daysIntoWeek =
    (now.getDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const daysUntilNextWeek = DAYS_PER_WEEK - daysIntoWeek;
  if (daysAhead > 0 && daysAhead < daysUntilNextWeek) {
    return { kind: 'this_week' };
  }
  if (
    daysAhead >= daysUntilNextWeek &&
    daysAhead < daysUntilNextWeek + DAYS_PER_WEEK
  ) {
    return { kind: 'next_week' };
  }
  return {
    kind: 'month',
    year: dueDate.getFullYear(),
    month: dueDate.getMonth(),
  };
}

export function dueSectionKey(section: DueSection): string {
  return section.kind === 'month'
    ? `${section.year}-${section.month}`
    : section.kind;
}

/** The month's name, with its year once it is not the current one. */
export function formatSectionMonth(
  section: Extract<DueSection, { kind: 'month' }>,
  locale: string,
  now: Date,
): string {
  const showsYear = section.year !== now.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: showsYear ? 'numeric' : undefined,
  }).format(new Date(section.year, section.month));
}
