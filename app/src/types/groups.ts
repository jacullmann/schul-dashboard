/**
 * A regular group is a class that attends every lesson together. An Abitur
 * group is a whole year: every subject is course-based and each course is
 * scheduled on its own, so two courses of the same subject can run on
 * different days.
 */
export type GroupType = 'regular' | 'abitur';

export const GROUP_TYPES: readonly GroupType[] = ['regular', 'abitur'] as const;

export function isGroupType(value: unknown): value is GroupType {
  return GROUP_TYPES.includes(value as GroupType);
}

/** Unknown values from the API degrade to a regular group. */
export function toGroupType(value: unknown): GroupType {
  return isGroupType(value) ? value : 'regular';
}
