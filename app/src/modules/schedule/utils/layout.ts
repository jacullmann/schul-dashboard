import type {
  Lesson,
  LessonGroup,
  ScheduleConfig,
  ScheduleLayout,
  ScheduleRow,
} from '@/modules/schedule/types';
import { lessonsSlotRange } from '@/modules/schedule/utils/lesson';
import { slotRangeMinutes } from '@/modules/schedule/utils/slotTimes';
import { formatTimeOfDay } from '@/utils/time';

/** The day headers take the first row. */
const FIRST_SLOT_ROW = 2;
const MIN_CELL_HEIGHT_PX = 58;
/** Each lesson a cell stacks needs this much, so parallel courses stay legible. */
const STACKED_LESSON_HEIGHT_PX = 54;

export type LessonRow = Extract<ScheduleRow, { kind: 'lesson' }>;

export const lessonRowsOf = (layout: Pick<ScheduleLayout, 'rows'>) =>
  layout.rows.filter((row): row is LessonRow => row.kind === 'lesson');

export interface ScheduleLayoutOptions {
  /**
   * Gives each break before this slot a row of its own; later breaks, and all
   * breaks by default, let lessons follow each other directly.
   */
  breaksBeforeSlot?: number;
  /** Slots a day ends after, each followed by a row that shows when it ends. */
  dayEndSlots?: ReadonlySet<number>;
  /** Slots that run into the next one without a gap, as a cell spanning both does. */
  joinedSlots?: ReadonlySet<number>;
}

/** Slots whose boundary to the next slot lies inside a cell and on no cell's edge. */
export function slotsJoinedToNext(groups: readonly LessonGroup[]): Set<number> {
  const spanned = new Set<number>();
  const edges = new Set<number>();
  for (const { lessons } of groups) {
    const { firstSlot, lastSlot } = lessonsSlotRange(lessons);
    edges.add(firstSlot - 1);
    edges.add(lastSlot);
    for (let slot = firstSlot; slot < lastSlot; slot++) spanned.add(slot);
  }
  return spanned.difference(edges);
}

/*
 * Lesson rows, interleaved with breaks where shown. A day that ends where no
 * break follows gets a row of its own, so its end shows a time like a break
 * does. Start times count every break, shown or not.
 */
export function buildScheduleLayout(
  config: ScheduleConfig,
  {
    breaksBeforeSlot = 0,
    dayEndSlots = new Set(),
    joinedSlots = new Set(),
  }: ScheduleLayoutOptions = {},
): ScheduleLayout {
  const rows: ScheduleRow[] = [];
  const lessonGridRows = new Map<number, number>();
  let gridRow = FIRST_SLOT_ROW;
  for (let slot = 1; slot <= config.totalSlots; slot++) {
    const { start, end } = slotRangeMinutes(config, slot);
    const endTime = formatTimeOfDay(end);
    lessonGridRows.set(slot, gridRow);
    rows.push({
      kind: 'lesson',
      gridRow: gridRow++,
      slot,
      startTime: formatTimeOfDay(start),
      joinsPrevious:
        joinedSlots.has(slot - 1) && rows.at(-1)?.kind === 'lesson',
    });

    const durationMins = config.breaks[slot] ?? 0;
    if (
      durationMins > 0 &&
      slot < Math.min(breaksBeforeSlot, config.totalSlots)
    ) {
      rows.push({
        kind: 'break',
        gridRow: gridRow++,
        afterSlot: slot,
        startTime: endTime,
        durationMins,
      });
    } else if (dayEndSlots.has(slot)) {
      rows.push({
        kind: 'dayEnd',
        gridRow: gridRow++,
        afterSlot: slot,
        startTime: endTime,
      });
    }
  }

  const gridRowOfSlot = (slot: number): number =>
    lessonGridRows.get(slot) ??
    slot + FIRST_SLOT_ROW - 1 + (rows.length - config.totalSlots);

  /*
   * Skeletons find their slot's row through the slot variables, not a fixed
   * row number: a later layout can insert rows, and a skeleton still fading
   * out would otherwise sit on the row that took its place and stretch it
   * until removed.
   */
  const gridStyle = {
    gridTemplateRows: `auto repeat(${rows.length}, auto)`,
    ...Object.fromEntries(
      [...lessonGridRows].map(([slot, row]) => [
        `--slot-${slot}-row`,
        String(row),
      ]),
    ),
  };

  const groupStyle = (group: readonly Lesson[], gridColumn: number) => {
    const { firstSlot, lastSlot } = lessonsSlotRange(group);
    const minHeight = Math.max(
      MIN_CELL_HEIGHT_PX,
      group.length * STACKED_LESSON_HEIGHT_PX,
    );
    return {
      gridColumn: String(gridColumn),
      gridRow: `${gridRowOfSlot(firstSlot)} / ${gridRowOfSlot(lastSlot) + 1}`,
      minHeight: `${minHeight}px`,
    };
  };

  return { rows, gridRowOfSlot, gridStyle, groupStyle };
}
