export type TickUnit = 'minute' | 'hour' | 'day';

interface TickInterval {
  unit: TickUnit;
  every: number;
}

const UNIT_SECONDS: Record<TickUnit, number> = {
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
};

/** From finest to coarsest; minutes and hours divide their day evenly, so ticks land on round clock times. */
const INTERVALS: readonly TickInterval[] = [
  { unit: 'minute', every: 5 },
  { unit: 'minute', every: 10 },
  { unit: 'minute', every: 15 },
  { unit: 'minute', every: 30 },
  { unit: 'hour', every: 1 },
  { unit: 'hour', every: 2 },
  { unit: 'hour', every: 3 },
  { unit: 'hour', every: 6 },
  { unit: 'hour', every: 12 },
  { unit: 'day', every: 1 },
  { unit: 'day', every: 2 },
  { unit: 'day', every: 3 },
  { unit: 'day', every: 5 },
  { unit: 'day', every: 7 },
];

export interface TimeTicks {
  unit: TickUnit;
  /** Unix seconds, ascending, all within the window. */
  timestamps: number[];
}

/**
 * Axis ticks at round local times between `start` and `end` (Unix seconds),
 * using the finest spacing that yields at most `maxTicks` of them.
 */
export function timeTicks(
  start: number,
  end: number,
  maxTicks: number,
): TimeTicks {
  const span = end - start;
  const interval =
    INTERVALS.find(
      ({ unit, every }) => span / (UNIT_SECONDS[unit] * every) <= maxTicks,
    ) ?? INTERVALS.at(-1)!;

  return { unit: interval.unit, timestamps: ticksWithin(start, end, interval) };
}

// Counting calendar fields up from the first day's local midnight, rather than
// adding seconds, keeps ticks on round times across daylight saving changes.
function ticksWithin(
  start: number,
  end: number,
  { unit, every }: TickInterval,
) {
  const first = new Date(start * 1000);
  const year = first.getFullYear();
  const month = first.getMonth();
  const day = first.getDate();

  const ticks: number[] = [];
  for (let step = 0; ; step++) {
    const offset = step * every;
    const tick =
      unit === 'minute'
        ? new Date(year, month, day, 0, offset)
        : unit === 'hour'
          ? new Date(year, month, day, offset)
          : new Date(year, month, day + offset);
    const timestamp = tick.getTime() / 1000;

    if (timestamp > end) return ticks;
    // A clock time skipped by daylight saving resolves to the next tick's time.
    if (timestamp >= start && timestamp !== ticks.at(-1)) ticks.push(timestamp);
  }
}
