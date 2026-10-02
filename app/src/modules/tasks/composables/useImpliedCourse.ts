import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useSubjectStore } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';
import type { HwItem } from '@/modules/tasks/types';

/**
 * A task's course goes without saying when its subject offers no other one,
 * or when the member only sees their own courses and this is one of them.
 */
export function useImpliedCourse(item: MaybeRefOrGetter<HwItem>) {
  const subjectStore = useSubjectStore();
  const userStore = useUserStore();

  return computed(() => {
    const { subjectId, courseId } = toValue(item);
    if (!subjectId || !courseId) return false;

    const user = userStore.user;
    if (user?.personalized && user.courses.some((c) => c.courseId === courseId))
      return true;

    return (
      subjectStore.subjects.find((s) => s.id === subjectId)?.courses?.length ===
      1
    );
  });
}
