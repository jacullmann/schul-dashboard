import { describe, expect, it } from 'vitest';
import type { ScheduleRow } from '@/modules/schedule/types';
import { nowMarkerOf } from './nowMarker';

const at = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const lesson = (gridRow: number, startTime: string): ScheduleRow => ({
  kind: 'lesson',
  gridRow,
  slot: gridRow - 1,
  startTime,
  joinsPrevious: false,
});

const day: ScheduleRow[] = [
  lesson(2, '08:00'),
  lesson(3, '08:45'),
  {
    kind: 'break',
    gridRow: 4,
    afterSlot: 2,
    startTime: '09:30',
    durationMins: 20,
  },
  lesson(5, '09:50'),
  { kind: 'dayEnd', gridRow: 6, afterSlot: 3, startTime: '10:35' },
];

describe('now marker', () => {
  it('shows nothing well before the first lesson or after the day ends', () => {
    expect(nowMarkerOf(day, at('07:56'))).toBeNull();
    expect(nowMarkerOf(day, at('10:39'))).toBeNull();
    expect(nowMarkerOf([], at('09:00'))).toBeNull();
  });

  it('runs through a lesson in proportion to the time passed', () => {
    expect(nowMarkerOf(day, at('08:15'))).toEqual({
      gridRow: 2,
      progress: 1 / 3,
      labelRow: null,
      breakMinutesLeft: null,
    });
  });

  it('takes over a time label it comes close to', () => {
    expect(nowMarkerOf(day, at('07:58'))).toMatchObject({
      gridRow: 2,
      progress: 0,
      labelRow: 2,
    });
    expect(nowMarkerOf(day, at('08:43'))).toMatchObject({
      gridRow: 2,
      labelRow: 3,
    });
    expect(nowMarkerOf(day, at('10:37'))).toMatchObject({
      gridRow: 6,
      progress: 0.5,
      labelRow: 6,
    });
  });

  it('holds on a break until it is over, counting down its minutes', () => {
    expect(nowMarkerOf(day, at('09:30'))).toEqual({
      gridRow: 4,
      progress: 0.5,
      labelRow: 4,
      breakMinutesLeft: 20,
    });
    expect(nowMarkerOf(day, at('09:48'))).toMatchObject({
      labelRow: 4,
      breakMinutesLeft: 2,
    });
    expect(nowMarkerOf(day, at('09:50'))).toMatchObject({
      gridRow: 5,
      progress: 0,
      labelRow: 5,
      breakMinutesLeft: null,
    });
  });
});
