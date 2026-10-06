import { describe, expect, it } from 'vitest';
import { dueSectionOf, formatSectionMonth } from './dueSection';

const MONDAY = 1;
const SUNDAY = 0;
// Wednesday, 7 October 2026, in the afternoon.
const now = new Date(2026, 9, 7, 15, 30);
const day = (date: number, month = 9, year = 2026) =>
  new Date(year, month, date, 8);

describe('dueSectionOf', () => {
  it('names today and tomorrow regardless of the time of day', () => {
    expect(dueSectionOf(new Date(2026, 9, 7, 0, 5), now, MONDAY).kind).toBe(
      'today',
    );
    expect(dueSectionOf(new Date(2026, 9, 8, 23, 55), now, MONDAY).kind).toBe(
      'tomorrow',
    );
  });

  it('names yesterday and the week covering the day before yesterday', () => {
    expect(dueSectionOf(day(6), now, MONDAY).kind).toBe('yesterday');
    // Wednesday: the day before yesterday, Monday, is still in this week.
    expect(dueSectionOf(day(5), now, MONDAY).kind).toBe('last_week');
    expect(dueSectionOf(day(4), now, MONDAY)).toMatchObject({ kind: 'month' });
    // Monday: the day before yesterday, Saturday, is in the previous week.
    const monday = new Date(2026, 9, 12, 9);
    expect(dueSectionOf(day(10), monday, MONDAY).kind).toBe('last_week');
    expect(dueSectionOf(day(5), monday, MONDAY).kind).toBe('last_week');
    expect(dueSectionOf(day(4), monday, MONDAY).kind).toBe('month');
  });

  it('splits the rest of this week from the next by the week start', () => {
    expect(dueSectionOf(day(11), now, MONDAY).kind).toBe('this_week');
    expect(dueSectionOf(day(12), now, MONDAY).kind).toBe('next_week');
    expect(dueSectionOf(day(18), now, MONDAY).kind).toBe('next_week');
    expect(dueSectionOf(day(11), now, SUNDAY).kind).toBe('next_week');
    expect(dueSectionOf(day(17), now, SUNDAY).kind).toBe('next_week');
  });

  it('names the rest of this month apart from its past days', () => {
    expect(dueSectionOf(day(19), now, MONDAY).kind).toBe('later_this_month');
    expect(dueSectionOf(day(31), now, MONDAY).kind).toBe('later_this_month');
  });

  it('files later and past tasks under their month', () => {
    expect(dueSectionOf(day(3, 10), now, MONDAY)).toEqual({
      kind: 'month',
      year: 2026,
      month: 10,
    });
    expect(dueSectionOf(day(3), now, MONDAY)).toEqual({
      kind: 'month',
      year: 2026,
      month: 9,
    });
  });
});

describe('formatSectionMonth', () => {
  it('adds the year only outside the current one', () => {
    expect(
      formatSectionMonth({ kind: 'month', year: 2026, month: 10 }, 'en', now),
    ).toBe('November');
    expect(
      formatSectionMonth({ kind: 'month', year: 2027, month: 0 }, 'en', now),
    ).toBe('January 2027');
  });
});
