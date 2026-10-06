import { describe, expect, it } from 'vitest';
import { timeTicks } from './timeTicks';

const at = (...fields: [number, number, number, number?, number?]) =>
  new Date(...fields).getTime() / 1000;

describe('timeTicks', () => {
  it('places ticks on round clock times inside the window', () => {
    const ticks = timeTicks(at(2026, 9, 6, 9, 7), at(2026, 9, 6, 10, 7), 6);

    expect(ticks.unit).toBe('minute');
    expect(ticks.timestamps).toEqual([
      at(2026, 9, 6, 9, 10),
      at(2026, 9, 6, 9, 20),
      at(2026, 9, 6, 9, 30),
      at(2026, 9, 6, 9, 40),
      at(2026, 9, 6, 9, 50),
      at(2026, 9, 6, 10, 0),
    ]);
  });

  it('uses the finest spacing that still fits', () => {
    const start = at(2026, 9, 6, 9, 7);
    const end = at(2026, 9, 6, 10, 7);

    expect(timeTicks(start, end, 12).timestamps).toHaveLength(12);
    expect(timeTicks(start, end, 2).unit).toBe('minute');
    expect(timeTicks(start, end, 2).timestamps).toEqual([
      at(2026, 9, 6, 9, 30),
      at(2026, 9, 6, 10, 0),
    ]);
  });

  it('marks local midnights for windows of days', () => {
    const ticks = timeTicks(at(2026, 8, 29, 10, 4), at(2026, 9, 6, 10, 4), 10);

    expect(ticks.unit).toBe('day');
    expect(ticks.timestamps).toEqual([
      at(2026, 8, 30),
      at(2026, 9, 1),
      at(2026, 9, 2),
      at(2026, 9, 3),
      at(2026, 9, 4),
      at(2026, 9, 5),
      at(2026, 9, 6),
    ]);
  });

  it('falls back to the coarsest spacing when nothing fits', () => {
    const ticks = timeTicks(at(2026, 8, 6), at(2026, 9, 6), 0);

    expect(ticks.unit).toBe('day');
    expect(ticks.timestamps.length).toBeLessThanOrEqual(5);
  });
});
