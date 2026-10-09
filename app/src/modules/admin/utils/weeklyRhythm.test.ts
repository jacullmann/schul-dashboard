import { describe, expect, it } from 'vitest';
import { busiestSlot, intensityLevel } from './weeklyRhythm';

describe('intensityLevel', () => {
  it('keeps the empty shade for slots without anyone', () => {
    expect(intensityLevel(0, 10, 4)).toBe(0);
    expect(intensityLevel(0, 0, 4)).toBe(0);
  });

  it('gives the faintest use the first visible shade', () => {
    expect(intensityLevel(1, 1000, 4)).toBe(1);
  });

  it('scales linearly up to the busiest slot', () => {
    expect(intensityLevel(25, 100, 4)).toBe(1);
    expect(intensityLevel(26, 100, 4)).toBe(2);
    expect(intensityLevel(75, 100, 4)).toBe(3);
    expect(intensityLevel(100, 100, 4)).toBe(4);
  });
});

describe('busiestSlot', () => {
  it('finds the slot with the most users', () => {
    const grid = [
      [0, 2, 0],
      [1, 0, 5],
    ];

    expect(busiestSlot(grid)).toEqual({ weekday: 1, hour: 2, value: 5 });
  });

  it('prefers the earliest slot on a tie', () => {
    expect(busiestSlot([[3, 3]])).toEqual({ weekday: 0, hour: 0, value: 3 });
  });

  it('has none while the app is unused', () => {
    expect(busiestSlot([[0, 0]])).toBeNull();
  });
});
