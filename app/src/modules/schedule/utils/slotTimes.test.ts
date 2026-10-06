import { describe, expect, it } from 'vitest';
import type { ScheduleConfig } from '@/modules/schedule/types';
import { freeTimeMinutes, lessonMinutes } from './slotTimes';

const config: ScheduleConfig = {
  startTime: '08:00',
  totalSlots: 6,
  lessonDurationMins: 45,
  breaks: { 2: 20, 4: 10 },
  dayBreaks: { 3: { 1: 20, 4: 10 }, 5: {} },
};

describe('free time', () => {
  it('runs from the lesson before to the lesson after', () => {
    expect(freeTimeMinutes(config, 1, 1, 1)).toEqual({
      start: 8 * 60,
      end: 8 * 60 + 45,
    });
  });

  it('takes in the breaks around and between its slots', () => {
    expect(freeTimeMinutes(config, 1, 3, 4)).toEqual({
      start: 9 * 60 + 30,
      end: 11 * 60 + 30,
    });
  });
});

describe('lesson times', () => {
  it('count the breaks of the lesson’s own day', () => {
    const third = { slot: 3, duration: 1 };
    expect(lessonMinutes(config, { ...third, day: 1 })).toEqual({
      start: 9 * 60 + 50,
      end: 10 * 60 + 35,
    });
    expect(lessonMinutes(config, { ...third, day: 3 })).toEqual({
      start: 9 * 60 + 50,
      end: 10 * 60 + 35,
    });
    expect(lessonMinutes(config, { ...third, day: 5 })).toEqual({
      start: 9 * 60 + 30,
      end: 10 * 60 + 15,
    });
  });

  it('span a break that only their day has', () => {
    expect(lessonMinutes(config, { day: 3, slot: 1, duration: 2 })).toEqual({
      start: 8 * 60,
      end: 9 * 60 + 50,
    });
  });
});
