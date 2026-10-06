import { describe, expect, it } from 'vitest';
import type { ScheduleConfig } from '@/modules/schedule/types';
import { freeTimeMinutes } from './slotTimes';

const config: ScheduleConfig = {
  startTime: '08:00',
  totalSlots: 6,
  lessonDurationMins: 45,
  breaks: { 2: 20, 4: 10 },
};

describe('free time', () => {
  it('runs from the lesson before to the lesson after', () => {
    expect(freeTimeMinutes(config, 1, 1)).toEqual({
      start: 8 * 60,
      end: 8 * 60 + 45,
    });
  });

  it('takes in the breaks around and between its slots', () => {
    expect(freeTimeMinutes(config, 3, 4)).toEqual({
      start: 9 * 60 + 30,
      end: 11 * 60 + 30,
    });
  });
});
