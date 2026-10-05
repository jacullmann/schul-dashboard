import { describe, expect, it } from 'vitest';
import {
  addDays,
  isoDate,
  mondayOf,
  parseIsoDate,
  weeksBetween,
} from './weekday';

describe('school weeks', () => {
  it('starts a week on the Monday before a date', () => {
    expect(isoDate(mondayOf(new Date(2026, 9, 11, 15)))).toBe('2026-10-05');
    expect(isoDate(mondayOf(new Date(2026, 9, 5, 0, 1)))).toBe('2026-10-05');
  });

  it('counts whole weeks across a daylight saving change', () => {
    const before = new Date(2026, 9, 19);
    const after = mondayOf(addDays(before, 14));
    expect(weeksBetween(before, after)).toBe(2);
    expect(weeksBetween(after, before)).toBe(-2);
  });

  it('names a week by its local date and reads the name back', () => {
    expect(isoDate(new Date(2027, 0, 4))).toBe('2027-01-04');
    expect(parseIsoDate('2027-01-04')).toEqual(new Date(2027, 0, 4));
  });
});
