import { describe, expect, it } from 'vitest';
import type { LessonGroup } from '@/modules/schedule/types';
import { freeSlotRuns } from './layout';

const group = (slot: number, duration = 1): LessonGroup => ({
  key: `${slot}`,
  day: 1,
  lessons: [{ id: `${slot}`, day: 1, slot, duration, room: null }],
});

describe('free slot runs', () => {
  it('joins free slots next to each other into one run', () => {
    expect(freeSlotRuns([group(1), group(5)], 5)).toEqual([
      { firstSlot: 2, lastSlot: 4 },
    ]);
  });

  it('keeps a single free slot between lessons on its own', () => {
    expect(freeSlotRuns([group(1), group(3), group(6)], 6)).toEqual([
      { firstSlot: 2, lastSlot: 2 },
      { firstSlot: 4, lastSlot: 5 },
    ]);
  });

  it('counts every slot a lesson spans as filled, and none past the last', () => {
    expect(freeSlotRuns([group(2, 2), group(6)], 6)).toEqual([
      { firstSlot: 1, lastSlot: 1 },
      { firstSlot: 4, lastSlot: 5 },
    ]);
  });
});
