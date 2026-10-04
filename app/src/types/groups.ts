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

/** Mirrors the server's limit in `common::names`. */
export const GROUP_NAME_MAX_LENGTH = 100;

/**
 * Where a member stands with picking their courses in a group: `pending`
 * keeps them on the setup page, and only `done` personalizes the group.
 */
export type CourseSetup = 'done' | 'pending' | 'not_needed';

const COURSE_SETUPS: readonly CourseSetup[] = [
  'done',
  'pending',
  'not_needed',
] as const;

/** Unknown values from the API never lock anyone out of a group. */
export function toCourseSetup(value: unknown): CourseSetup {
  return COURSE_SETUPS.includes(value as CourseSetup)
    ? (value as CourseSetup)
    : 'not_needed';
}
