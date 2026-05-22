import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import hw from '@/api/hwApi';

export interface Course {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  is_active: boolean;
  category: 'core' | 'elective' | 'extra';
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

  function reset() {
    subjects.value = [];
    loaded.value = false;
    loading.value = false;
  }

  const availableSubjectKeys = computed(() => {
    return subjects.value.filter((s) => s.is_active).map((s) => s.name);
  });

  const electiveSubjects = computed(() => {
    return subjects.value.filter(
      (s) => s.category === 'elective' && s.courses && s.courses.length >= 1,
    );
  });

  const extraSubjects = computed(() => {
    return subjects.value.filter(
      (s) => s.category === 'extra' && s.courses && s.courses.length >= 1,
    );
  });

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
    electiveSubjects,
    extraSubjects,
  };
});
