import { describe, expect, it } from 'vitest';
import { isDueByEndOfToday } from './dueDate';

// Berlin is UTC+2 in October, so these instants straddle its midnight.
describe('isDueByEndOfToday', () => {
  const now = new Date('2026-10-08T21:30:00Z'); // Berlin: 8 Oct, 23:30

  it('counts a task due earlier the same Berlin day as due today', () => {
    expect(isDueByEndOfToday({ dueDate: '2026-10-08T21:00:00Z' }, now)).toBe(
      true,
    );
  });

  it('does not count a task due after Berlin midnight as due today', () => {
    expect(isDueByEndOfToday({ dueDate: '2026-10-08T22:30:00Z' }, now)).toBe(
      false,
    );
  });

  it('keeps tasks from earlier Berlin days due', () => {
    expect(
      isDueByEndOfToday(
        { dueDate: '2026-10-07T10:00:00Z' },
        new Date('2026-10-08T22:30:00Z'),
      ),
    ).toBe(true);
  });
});
