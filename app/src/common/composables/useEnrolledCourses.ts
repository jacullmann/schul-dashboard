import { computed } from 'vue';
import { useSubjectStore, type Course } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';

/**
 * Resolves the course the current user attends per subject so that course
 * dropdowns can preselect it instead of starting out empty.
 */
export function useEnrolledCourses() {
  const subjectStore = useSubjectStore();
  const userStore = useUserStore();

  // Enrollments pointing at courses the group no longer offers are dropped:
  // a select must never default to a value that is not one of its options.
  const enrolledCourseBySubjectId = computed(() => {
    const bySubject = new Map<string, Course>();

    for (const { subjectId, courseId } of userStore.user?.courses ?? []) {
      const course = subjectStore.subjects
        .find((s) => s.id === subjectId)
        ?.courses?.find((c) => c.id === courseId);

      if (course) bySubject.set(subjectId, course);
    }

    return bySubject;
  });

  function enrolledCourseForSubjectId(
    subjectId: string | null | undefined,
  ): Course | undefined {
    if (!subjectId) return undefined;
    return enrolledCourseBySubjectId.value.get(subjectId);
  }

  function enrolledCourseForSubjectName(
    subjectName: string | null | undefined,
  ): Course | undefined {
    if (!subjectName) return undefined;
    const subject = subjectStore.subjects.find((s) => s.name === subjectName);
    return enrolledCourseForSubjectId(subject?.id);
  }

  return {
    enrolledCourseBySubjectId,
    enrolledCourseForSubjectId,
    enrolledCourseForSubjectName,
  };
}
