import type { ScheduleRow } from '@/modules/schedule/types';
import { minutesSinceMidnight } from '@/utils/time';

/** How close now has to come to a row's time to take the place of its label. */
export const MERGE_MINUTES = 3;

export interface NowMarker {
  /** The row now falls in. */
  gridRow: number;
  /** How far through its row now is; a break or the day's end holds it halfway. */
  progress: number;
  /** The row whose time label now has come close enough to take over. */
  labelRow: number | null;
  /** The minutes left of the break now falls in. */
  breakMinutesLeft: number | null;
}

/**
 * Where now falls along a day's rows, ordered by time. A lesson's row runs
 * from its start to whatever follows it; a break holds now on its divider,
 * and on its label, until the next lesson starts.
 */
export function nowMarkerOf(
  rows: readonly ScheduleRow[],
  nowMinutes: number,
): NowMarker | null {
  const timed = rows.map((row) => ({
    row,
    minutes: minutesSinceMidnight(row.startTime),
  }));
  const first = timed[0];
  const last = timed.at(-1);
  if (
    !first ||
    !last ||
    nowMinutes < first.minutes - MERGE_MINUTES ||
    nowMinutes > last.minutes + MERGE_MINUTES
  ) {
    return null;
  }

  const currentIndex = Math.max(
    0,
    timed.findLastIndex(({ minutes }) => minutes <= nowMinutes),
  );
  const current = timed[currentIndex] ?? first;
  const next = timed[currentIndex + 1];
  const { row } = current;

  if (row.kind === 'break') {
    return {
      gridRow: row.gridRow,
      progress: 0.5,
      labelRow: row.gridRow,
      breakMinutesLeft: current.minutes + row.durationMins - nowMinutes,
    };
  }

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

  const progress =
    row.kind === 'lesson' && next
      ? (nowMinutes - current.minutes) / (next.minutes - current.minutes)
      : 0.5;
  return {
    gridRow: row.gridRow,
    progress: Math.min(Math.max(progress, 0), 1),
    labelRow,
    breakMinutesLeft: null,
  };
}
