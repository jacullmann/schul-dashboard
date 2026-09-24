import type { Lesson } from '@/modules/schedule/types';
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
