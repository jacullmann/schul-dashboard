import { computed, ref, shallowRef, watch } from 'vue';
import hw from '@/api/api';
import { groupPath } from '@/api/groupPath';
import { useSubjectStore } from '@/stores/subjectStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type { Enrollment } from '@/common/composables/useCourseSelection';
import type { Lesson } from '@/modules/schedule/types';
import {
  scheduleConfigOrDefault,
  timeSlotsOf,
} from '@/modules/schedule/utils/slotTimes';
import {
  courseLevelsOf,
  coursesAtLevel,
  defaultCourseLevel,
  type CourseLevel,
} from '@/modules/auth/utils/courseLevels';
import {
  createCourseResolver,
  type CourseCandidates,
  type CoursePicks,
} from '@/modules/auth/utils/courseResolution';

/**
 * An Abitur member's first course choice: a level per subject first, then the
 * exact course wherever a level leaves more than one, picked in the timetable.
 */
export function useCourseSetup(groupId: string) {
  const subjectStore = useSubjectStore();
  const { findGroup } = useAppAuth();

  const subjects = computed(() => [
    ...subjectStore.requiredCourseSubjects,
    ...subjectStore.optionalCourseSubjects,
  ]);

  const levelOptions = computed(
    () =>
      new Map(
        subjects.value.map((subject) => [subject.id, courseLevelsOf(subject)]),
      ),
  );

  const levels = ref<Record<string, CourseLevel | null>>({});

  watch(
    levelOptions,
    (options) => {
      levels.value = Object.fromEntries(
        [...options].map(([subjectId, offered]) => [
          subjectId,
          defaultCourseLevel(offered),
        ]),
      );
    },
    { immediate: true },
  );

  const hasAllLevels = computed(() =>
    subjects.value.every((subject) => levels.value[subject.id] != null),
  );

  const candidates = computed<CourseCandidates>(
    () =>
      new Map(
        subjects.value.flatMap((subject) => {
          const level = levels.value[subject.id];
          const courseIds = level
            ? coursesAtLevel(subject, level).map((course) => course.id)
            : [];
          return courseIds.length > 0 ? [[subject.id, courseIds]] : [];
        }),
      ),
  );

  /** Some level leaves more than one course, so the timetable has to tell. */
  const needsLessonChoice = computed(() =>
    [...candidates.value.values()].some((courseIds) => courseIds.length > 1),
  );

  const lessons = shallowRef<Lesson[]>([]);
  const loadingLessons = ref(false);
  let lessonsRequest: Promise<void> | null = null;

  /**
   * The whole timetable: the member's own one hides courses not yet taken.
   * Callers share one request, and a failed one can be retried.
   */
  function loadLessons(): Promise<void> {
    lessonsRequest ??= (async () => {
      loadingLessons.value = true;
      try {
        const { data } = await hw.get<Lesson[]>(
          groupPath(groupId, '/admin/schedule'),
        );
        lessons.value = data ?? [];
      } catch (e) {
        lessonsRequest = null;
        throw e;
      } finally {
        loadingLessons.value = false;
      }
    })();
    return lessonsRequest;
  }

  const timeSlots = computed(() =>
    timeSlotsOf(scheduleConfigOrDefault(findGroup(groupId)?.scheduleConfig)),
  );

  const resolver = computed(() =>
    createCourseResolver(candidates.value, lessons.value),
  );
  const picks = shallowRef<CoursePicks>(new Map());
  const resolution = computed(() => resolver.value.resolve(picks.value));

  function toggleCourse(courseId: string) {
    picks.value = resolver.value.togglePick(
      resolution.value,
      picks.value,
      courseId,
    );
  }

  const canToggleCourse = (courseId: string) =>
    resolver.value.isPickable(resolution.value, courseId);

  /*
   * Lessons of a subject nobody picks a course in concern everyone, and so do
   * course-less lessons of a subject the member takes. Course lessons show
   * only while the member could still attend that course.
   */
  const setupLessons = computed(() => {
    const courseSubjectIds = new Set(
      subjects.value.map((subject) => subject.id),
    );
    return lessons.value.filter((lesson) => {
      if (lesson.courseId && resolver.value.subjectOf.has(lesson.courseId)) {
        return true;
      }
      const subjectId = lesson.subjectId ?? lesson.subjects?.id;
      if (!subjectId || !courseSubjectIds.has(subjectId)) return true;
      return !lesson.courseId && candidates.value.has(subjectId);
    });
  });

  const enrollments = computed<Enrollment[]>(() =>
    [...resolution.value.chosen].map(([subjectId, courseId]) => ({
      subjectId,
      courseId,
    })),
  );

  /** Subjects the member takes whose course is still undecided. */
  const openSubjects = computed(() =>
    subjects.value.filter(
      (subject) =>
        candidates.value.has(subject.id) &&
        !resolution.value.chosen.has(subject.id),
    ),
  );

  return {
    subjects,
    levelOptions,
    levels,
    hasAllLevels,
    needsLessonChoice,
    loadingLessons,
    loadLessons,
    timeSlots,
    setupLessons,
    resolution,
    toggleCourse,
    canToggleCourse,
    enrollments,
    openSubjects,
  };
}
