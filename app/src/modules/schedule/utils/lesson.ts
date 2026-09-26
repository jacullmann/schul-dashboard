import type {
  Lesson,
  LessonGroup,
  ScheduleCourse,
  ScheduleSubject,
} from '@/modules/schedule/types';
import { DALTON_SUBJECT_KEY } from '@/types/subjects';

/**
 * The stored subject name of a lesson, or the Dalton key for the pseudo-subject.
 * Both double as `common.subjects.*` translation keys where one exists.
 */
export function lessonSubjectName(
  lesson: Pick<Lesson, 'isDalton' | 'subjects' | 'subject' | 'subjectAbbr'>,
): string {
  if (lesson.isDalton) return DALTON_SUBJECT_KEY;
  return lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
}

/** How many slots a lesson fills; a missing or zero duration still fills its own. */
export function lessonSpan(lesson: { duration?: number | null }): number {
  return Math.max(1, Number(lesson.duration || 1));
}

/** The last slot a lesson fills. */
export function lessonLastSlot(
  lesson: Pick<Lesson, 'slot'> & { duration?: number | null },
): number {
  return Number(lesson.slot) + lessonSpan(lesson) - 1;
}

export function groupLessonsBySlot(lessons: Lesson[]): LessonGroup[] {
  const groups = new Map<string, LessonGroup>();
  for (const lesson of lessons) {
    const key = `${lesson.day}-${lesson.slot}`;
    const group = groups.get(key);
    if (group) {
      group.lessons.push(lesson);
    } else {
      groups.set(key, { key, day: lesson.day, lessons: [lesson] });
    }
  }
  return [...groups.values()];
}

export function subjectsById(
  subjects: readonly ScheduleSubject[],
): ReadonlyMap<string, ScheduleSubject> {
  return new Map(
    subjects
      .filter((subject) => subject?.id)
      .map((subject) => [subject.id, subject]),
  );
}

export interface ResolvedLessonSubject {
  subjectId: string | null;
  subjects: Lesson['subjects'];
  /** Every course of the lesson's subject. */
  courses: ScheduleCourse[];
  ownCourseId: string | null;
  /** The one course the lesson is scheduled for, if it names one the group knows. */
  ownCourse: ScheduleCourse | null;
}

/** A lesson's subject and course, filled in from the group's subjects where the lesson only carries ids. */
export function resolveLessonSubject(
  lesson: Lesson,
  subjects: ReadonlyMap<string, ScheduleSubject>,
): ResolvedLessonSubject {
  const subjectId = lesson.subjectId || lesson.subjects?.id;
  const subject = subjectId ? subjects.get(subjectId) : undefined;
  const courses = subject?.courses ?? [];
  const ownCourseId = lesson.courseId || lesson.courses?.id || null;

  return {
    subjectId: subjectId || null,
    subjects:
      lesson.subjects ||
      (subject ? { id: subject.id, name: subject.name } : null),
    courses,
    ownCourseId,
    ownCourse:
      lesson.courses ??
      (ownCourseId
        ? (courses.find((course) => course.id === ownCourseId) ?? null)
        : null),
  };
}
