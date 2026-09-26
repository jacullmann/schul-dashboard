const COLUMN_STAGGER_MS = 40;
const ROW_STAGGER_MS = 25;

/**
 * Lessons that replace skeletons sweep in at this share of the entrance
 * stagger: the skeletons already carried the entrance, so the content only
 * needs to settle into place, not arrive again.
 */
export const REVEAL_PACE = 0.5;

/**
 * When a schedule cell starts its entrance: a diagonal wave from the top-left
 * corner, so the table unfolds instead of popping in at once.
 */
export function entranceDelay(column: number, row: number, pace = 1): string {
  return `${(column * COLUMN_STAGGER_MS + row * ROW_STAGGER_MS) * pace}ms`;
}
