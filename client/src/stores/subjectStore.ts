import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import hw from '@/api/hwApi';

export interface Course {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  is_active: boolean;
  courses?: Course[];
}

export const useSubjectStore = defineStore('subjectStore', () => {
  const subjects = ref<Subject[]>([]);
  const loading = ref(false);
  const loaded = ref(false);

  async function loadSubjects() {
    if (loaded.value || loading.value) return;
    loading.value = true;
    try {
      const { data } = await hw.get<Subject[]>('/api/schedule/subjects');
      subjects.value = data || [];
      loaded.value = true;
    } catch (e) {
      console.error('Failed to load subjects', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Reset the store so subjects are reloaded on next access.
   * Called when the active tenant/group changes.
   */
  function reset() {
    subjects.value = [];
    loaded.value = false;
    loading.value = false;
  }

  const availableSubjectKeys = computed(() => {
    return subjects.value.filter((s) => s.is_active).map((s) => s.name);
  });

  const enrCourses = computed(() => {
    const match = subjects.value.find((s) => s.name === 'enrichment');
    return match?.courses || [];
  });

  const wpu1Courses = computed(() => {
    const match = subjects.value.find((s) => s.name === 'wpu1');
    return match?.courses || [];
  });

  const wpu2Courses = computed(() => {
    const match = subjects.value.find((s) => s.name === 'wpu2');
    return match?.courses || [];
  });

  // Listen for tenant changes and reset cached subjects
  function onTenantChanged() {
    reset();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('tenant-changed', onTenantChanged);
  }

  return {
    subjects,
    loading,
    loaded,
    loadSubjects,
    reset,
    availableSubjectKeys,
    enrCourses,
    wpu1Courses,
    wpu2Courses,
  };
});
