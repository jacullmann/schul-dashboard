import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import hw from '@/api/api.ts';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import {
  courseSelectionFor,
  type CourseType,
  type SubjectCategory,
} from '@/types/subjects';

export interface Course {
  id: string;
  name: string;
  /** GK/LK/ZK in an Abitur group, absent everywhere else. */
  courseType?: CourseType | null;
}

export interface Subject {
  id: string;
  name: string;
  category: SubjectCategory;
  courses?: Course[];
}

export const useSubjectStore = defineStore('subjectStore', () => {
  const { activeGroupType } = useAppAuth();

  const subjects = ref<Subject[]>([]);
  const loading = ref(false);
  const loaded = ref(false);

  async function loadSubjects() {
    if (loaded.value || loading.value) return;
    loading.value = true;
    try {
      const { data } = await hw.get<Subject[]>('/schedule/subjects');
      subjects.value = data || [];
      loaded.value = true;
    } catch (e) {
      console.error('Failed to load subjects', e);
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    subjects.value = [];
    loaded.value = false;
    loading.value = false;
  }

  const availableSubjectKeys = computed(() => {
    return subjects.value.map((s) => s.name);
  });

  const withCourses = (selection: 'required' | 'optional') =>
    subjects.value.filter(
      (s) =>
        courseSelectionFor(s.category) === selection &&
        (s.courses?.length ?? 0) >= 1,
    );

  /** Subjects whose course a member has to pick. */
  const requiredCourseSubjects = computed(() => withCourses('required'));

  /** Subjects where a member picks one course or none — all Abitur subjects. */
  const optionalCourseSubjects = computed(() => withCourses('optional'));

  const groupType = computed(() => activeGroupType.value);

  function onTenantChanged() {
    reset();
  }

  useEventListener(window, 'tenant-changed', onTenantChanged);

  return {
    subjects,
    loading,
    loaded,
    loadSubjects,
    reset,
    availableSubjectKeys,
    groupType,
    requiredCourseSubjects,
    optionalCourseSubjects,
  };
});
