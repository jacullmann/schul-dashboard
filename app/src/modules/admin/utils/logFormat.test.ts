import { describe, expect, it } from 'vitest';
import {
  calendarDaysAgo,
  groupByDay,
  humanizeKey,
  isIsoDateTime,
  typeKeyPath,
} from './logFormat';

describe('groupByDay', () => {
  it('keeps entries in order and starts a group for each new day', () => {
    const at = (day: number, hour: number) =>
      new Date(2026, 9, day, hour).toISOString();
    const entries = [at(10, 18), at(10, 8), at(9, 23), at(7, 12)];

    const days = groupByDay(entries, (entry) => entry);

    expect(days.map((day) => day.key)).toEqual([
      '2026-10-10',
      '2026-10-09',
      '2026-10-07',
    ]);
    expect(days[0]?.entries).toEqual([at(10, 18), at(10, 8)]);
  });

  it('returns no groups for no entries', () => {
    expect(groupByDay([], (entry: string) => entry)).toEqual([]);
  });
});

describe('calendarDaysAgo', () => {
  it('counts calendar days rather than elapsed time', () => {
    const now = new Date(2026, 9, 10, 0, 30);
    expect(calendarDaysAgo(new Date(2026, 9, 10, 0, 5), now)).toBe(0);
    expect(calendarDaysAgo(new Date(2026, 9, 9, 23, 55), now)).toBe(1);
    expect(calendarDaysAgo(new Date(2026, 9, 1, 12), now)).toBe(9);
  });

  it('counts a day across a daylight saving change as one', () => {
    expect(
      calendarDaysAgo(new Date(2026, 9, 25, 1), new Date(2026, 9, 26, 1)),
    ).toBe(1);
  });
});

describe('typeKeyPath', () => {
  it('turns the segments of a stored type into an i18n path', () => {
    expect(typeKeyPath('auth:sign_in')).toBe('auth.sign_in');
    expect(typeKeyPath('group-admin:subject:create')).toBe(
      'group_admin.subject.create',
    );
  });
});

describe('humanizeKey', () => {
  it('splits camel and snake case into a sentence', () => {
    expect(humanizeKey('secondFactor')).toBe('Second factor');
    expect(humanizeKey('expires_at')).toBe('Expires at');
    expect(humanizeKey('ip')).toBe('Ip');
  });
});

describe('isIsoDateTime', () => {
  it('accepts timestamps only', () => {
    expect(isIsoDateTime('2026-10-10T08:12:16.572Z')).toBe(true);
    expect(isIsoDateTime('2026-10-10')).toBe(false);
    expect(isIsoDateTime('wrong_password')).toBe(false);
  });
});
