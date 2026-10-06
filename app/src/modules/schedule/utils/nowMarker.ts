import type { ScheduleRow } from '@/modules/schedule/types';
import { minutesSinceMidnight } from '@/utils/time';

/** How close now has to come to a row's time to take the place of its label. */
export const MERGE_MINUTES = 3;

/** Rows one cell spans, which now passes as one. */
export interface RowSpan {
  firstRow: number;
  lastRow: number;
}

export interface NowMarker extends RowSpan {
  /** How far through its rows now is; a break or the day's end holds it halfway. */
  progress: number;
  /** The row whose time label now has come close enough to take over. */
  labelRow: number | null;
  /** The minutes left of the break now falls in. */
  breakMinutesLeft: number | null;
}

const clampProgress = (progress: number) => Math.min(Math.max(progress, 0), 1);

/**
 * Where now falls along a day's rows, ordered by time. A lesson's row runs
 * from its start to whatever follows it, a cell spanning several rows from
 * its first row's start to whatever follows its last. A break outside any
 * cell holds now on its divider, and on its label, until the next lesson
 * starts; the day's end holds it until the day is over.
 */
export function nowMarkerOf(
  rows: readonly ScheduleRow[],
  cells: readonly RowSpan[],
  nowMinutes: number,
): NowMarker | null {
  const timed = rows.map((row) => ({
    row,
    minutes: minutesSinceMidnight(row.startTime),
  }));
  const first = timed[0];
  if (!first || nowMinutes < first.minutes - MERGE_MINUTES) return null;

  const current =
    timed.findLast(({ minutes }) => minutes <= nowMinutes) ?? first;
  const { row } = current;

  const nearest = timed.reduce((best, candidate) =>
    Math.abs(candidate.minutes - nowMinutes) <
    Math.abs(best.minutes - nowMinutes)
      ? candidate
      : best,
  );
  const labelRow =
    Math.abs(nearest.minutes - nowMinutes) <= MERGE_MINUTES
      ? nearest.row.gridRow
      : null;

  const cell = cells.find(
    ({ firstRow, lastRow }) =>
      firstRow <= row.gridRow && row.gridRow <= lastRow,
  ) ?? { firstRow: row.gridRow, lastRow: row.gridRow };
  const start =
    timed.find(({ row: { gridRow } }) => gridRow === cell.firstRow)?.minutes ??
    current.minutes;
  const end = timed.find(({ row: { gridRow } }) => gridRow > cell.lastRow);

  if (row.kind === 'break' && cell.firstRow === cell.lastRow) {
    return {
      ...cell,
      progress: 0.5,
      labelRow: row.gridRow,
      breakMinutesLeft: current.minutes + row.durationMins - nowMinutes,
    };
  }

  return {
    ...cell,
    progress:
      row.kind === 'dayEnd' || !end
        ? 0.5
        : clampProgress((nowMinutes - start) / (end.minutes - start)),
    labelRow,
    breakMinutesLeft: null,
  };
}
