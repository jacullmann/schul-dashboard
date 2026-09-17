import type { GroupType } from '@/types/groups';

export type RegularSubjectCategory = 'core' | 'elective' | 'extra';
export type AbiturSubjectCategory = 'gk' | 'lk' | 'zk';
export type SubjectCategory = RegularSubjectCategory | AbiturSubjectCategory;

export const SUBJECT_CATEGORIES: Record<GroupType, readonly SubjectCategory[]> =
  {
    regular: ['core', 'elective', 'extra'],
    abitur: ['gk', 'lk', 'zk'],
  } as const;

/**
 * How a subject's courses are offered to a member:
 * - `none`: everybody attends the subject, there is nothing to pick.
 * - `required`: the member has to pick one of the courses.
 * - `optional`: the member picks one course or none at all.
 */
export type CourseSelection = 'none' | 'required' | 'optional';

const COURSE_SELECTION: Record<SubjectCategory, CourseSelection> = {
  core: 'none',
  elective: 'required',
  extra: 'optional',
  // Every Abitur subject is course-based and may be skipped.
  gk: 'optional',
  lk: 'optional',
  zk: 'optional',
};

/** Categories of the other group type stay readable after a type switch. */
const CATEGORY_EQUIVALENTS: Record<SubjectCategory, SubjectCategory> = {
  core: 'gk',
  elective: 'gk',
  extra: 'zk',
  gk: 'elective',
  lk: 'elective',
  zk: 'extra',
};

export function isSubjectCategory(value: unknown): value is SubjectCategory {
  return typeof value === 'string' && value in COURSE_SELECTION;
}

export function defaultSubjectCategory(groupType: GroupType): SubjectCategory {
  return groupType === 'abitur' ? 'gk' : 'core';
}

export function subjectCategoriesFor(
  groupType: GroupType,
): readonly SubjectCategory[] {
  return SUBJECT_CATEGORIES[groupType];
}

export function categoryBelongsTo(
  category: unknown,
  groupType: GroupType,
): boolean {
  return (
    isSubjectCategory(category) &&
    subjectCategoriesFor(groupType).includes(category)
  );
}

/**
 * Maps a stored category onto one the current group type accepts. A group that
 * switched its type keeps its subjects, so their categories can be from the
 * other set until they are saved again.
 */
export function normalizeSubjectCategory(
  category: unknown,
  groupType: GroupType,
): SubjectCategory {
  if (!isSubjectCategory(category)) return defaultSubjectCategory(groupType);
  if (categoryBelongsTo(category, groupType)) return category;

  const equivalent = CATEGORY_EQUIVALENTS[category];
  return categoryBelongsTo(equivalent, groupType)
    ? equivalent
    : defaultSubjectCategory(groupType);
}

export function courseSelectionFor(category: unknown): CourseSelection {
  return isSubjectCategory(category) ? COURSE_SELECTION[category] : 'none';
}

/**
 * True when a task or lesson for this subject needs a course to identify who it
 * is meant for. An optional subject with a single course is unambiguous.
 */
export function subjectNeedsCourseChoice(
  category: unknown,
  courseCount: number,
): boolean {
  switch (courseSelectionFor(category)) {
    case 'required':
      return courseCount >= 1;
    case 'optional':
      return courseCount >= 2;
    default:
      return false;
  }
}

export function getSubjectKey(subject: string): string {
  return subject;
}
