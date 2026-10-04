import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { groupPath } from '@/api/groupPath';
import { useSubjectStore, type Subject } from '@/stores/subjectStore';
import { useUserStore, type UserData } from '@/stores/userStore';
import {
  courseLabel,
  courseTypeHint,
  subjectLabel,
} from '@/utils/subject-formatter';
import type { UnitOption } from '@/common/components/BaseSelect.vue';

export type Enrollment = UserData['courses'][number];

export const NO_COURSE = 'NONE';

/**
 * The member's course per subject of `groupId`, shared by the
 * onboarding modal and the "My courses" settings page.
 */
export function useCourseSelection(groupId: string) {
  const i18n = useI18n();
  const t = i18n.t.bind(i18n);
  const te = i18n.te.bind(i18n);
  const subjectStore = useSubjectStore();
  const userStore = useUserStore();

  const selections = reactive<Record<string, string>>({});

  const courseSubjects = computed(() => [
    ...subjectStore.requiredCourseSubjects,
    ...subjectStore.optionalCourseSubjects,
  ]);

  function resetSelections(enrolled: Enrollment[]) {
    for (const key of Object.keys(selections)) {
      delete selections[key];
    }

    for (const subject of subjectStore.requiredCourseSubjects) {
      selections[subject.id] = '';
    }
    for (const subject of subjectStore.optionalCourseSubjects) {
      selections[subject.id] = NO_COURSE;
    }

    for (const { subjectId, courseId } of enrolled) {
      const subject = courseSubjects.value.find((s) => s.id === subjectId);
      if (subject?.courses?.some((course) => course.id === courseId)) {
        selections[subjectId] = courseId;
      }
    }
  }

  function translatedName(name: string): string {
    return subjectLabel(name, t, te);
  }

  function optionsForSubject(subject: Subject, isOptional: boolean) {
    const options = (subject.courses ?? []).map(
      (course): UnitOption => ({
        label: courseLabel(course.name, t, te),
        value: course.id,
        hint: courseTypeHint(course.courseType, t, te),
      }),
    );
    if (isOptional) {
      options.unshift({ label: t('common.selection.no'), value: NO_COURSE });
    }
    return options;
  }

  const hasRequiredSelections = computed(() =>
    subjectStore.requiredCourseSubjects.every(
      (subject) => !!selections[subject.id],
    ),
  );

  const selectedCourses = computed<Enrollment[]>(() =>
    courseSubjects.value.flatMap((subject) => {
      const courseId = selections[subject.id];
      return courseId &&
        courseId !== NO_COURSE &&
        subject.courses?.some((c) => c.id === courseId)
        ? [{ subjectId: subject.id, courseId }]
        : [];
    }),
  );

  async function saveCourses(
    courses: Enrollment[],
  ): Promise<Partial<UserData>> {
    const { data } = await hw.patch(groupPath(groupId, '/me/courses'), {
      courses,
    });

    const groupSubjectIds = new Set(subjectStore.subjects.map((s) => s.id));
    const otherGroupsCourses = (userStore.user?.courses ?? []).filter(
      (c) => !groupSubjectIds.has(c.subjectId),
    );

    const updatedUser: Partial<UserData> = {
      ...(data?.user || userStore.user || {}),
      doneSetup: true,
      courses: [...otherGroupsCourses, ...courses],
    };
    userStore.updateUser(updatedUser);
    return updatedUser;
  }

  return {
    selections,
    resetSelections,
    translatedName,
    optionsForSubject,
    hasRequiredSelections,
    selectedCourses,
    saveCourses,
  };
}
