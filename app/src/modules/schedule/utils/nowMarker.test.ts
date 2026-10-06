import { describe, expect, it } from 'vitest';
import type { ScheduleRow } from '@/modules/schedule/types';
import { nowMarkerOf, type RowSpan } from './nowMarker';

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

const singleCells: RowSpan[] = [
  { firstRow: 2, lastRow: 2 },
  { firstRow: 3, lastRow: 3 },
  { firstRow: 5, lastRow: 5 },
];

const marker = (time: string, cells = singleCells) =>
  nowMarkerOf(day, cells, at(time));

describe('now marker', () => {
  it('shows nothing well before the first lesson', () => {
    expect(marker('07:56')).toBeNull();
    expect(nowMarkerOf([], [], at('09:00'))).toBeNull();
  });

  it('runs through a lesson in proportion to the time passed', () => {
    expect(marker('08:15')).toEqual({
      firstRow: 2,
      lastRow: 2,
      progress: 1 / 3,
      labelRow: null,
      breakMinutesLeft: null,
    });
  });

  it('runs through a cell spanning several rows as one', () => {
    const doubleLesson = [{ firstRow: 2, lastRow: 3 }];
    expect(marker('08:45', doubleLesson)).toMatchObject({
      firstRow: 2,
      lastRow: 3,
      progress: 0.5,
    });
  });

  it('runs through a break a cell spans instead of holding on it', () => {
    const acrossBreak = [{ firstRow: 3, lastRow: 5 }];
    expect(marker('09:40', acrossBreak)).toMatchObject({
      firstRow: 3,
      lastRow: 5,
      progress: 55 / 110,
      breakMinutesLeft: null,
    });
  });

  it('takes over a time label it comes close to', () => {
    expect(marker('07:58')).toMatchObject({
      firstRow: 2,
      progress: 0,
      labelRow: 2,
    });
    expect(marker('08:43')).toMatchObject({ firstRow: 2, labelRow: 3 });
  });

  it('holds on a break until it is over, counting down its minutes', () => {
    expect(marker('09:30')).toEqual({
      firstRow: 4,
      lastRow: 4,
      progress: 0.5,
      labelRow: 4,
      breakMinutesLeft: 20,
    });
    expect(marker('09:48')).toMatchObject({
      labelRow: 4,
      breakMinutesLeft: 2,
    });
    expect(marker('09:50')).toMatchObject({
      firstRow: 5,
      progress: 0,
      labelRow: 5,
      breakMinutesLeft: null,
    });
  });

  it('stays on the day’s end for the rest of the day', () => {
    expect(marker('10:37')).toMatchObject({ firstRow: 6, labelRow: 6 });
    expect(marker('18:00')).toEqual({
      firstRow: 6,
      lastRow: 6,
      progress: 0.5,
      labelRow: null,
      breakMinutesLeft: null,
    });
  });
});
