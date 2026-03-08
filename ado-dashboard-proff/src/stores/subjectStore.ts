import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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
            const { data } = await hw.get<Subject[]>('/api/timetable/subjects');
            subjects.value = data || [];
            loaded.value = true;
        } catch (e) {
            console.error('Failed to load subjects', e);
        } finally {
            loading.value = false;
        }
    }

    const availableSubjectKeys = computed(() => {
        return subjects.value.filter(s => s.is_active).map(s => s.name);
    });

    const enrCourses = computed(() => {
        const match = subjects.value.find(s => s.name === 'enrichment');
        return match?.courses || [];
    });

    const wpu1Courses = computed(() => {
        const match = subjects.value.find(s => s.name === 'wpu1');
        return match?.courses || [];
    });

    const wpu2Courses = computed(() => {
        const match = subjects.value.find(s => s.name === 'wpu2');
        return match?.courses || [];
    });

    return {
        subjects,
        loading,
        loaded,
        loadSubjects,
        availableSubjectKeys,
        enrCourses,
        wpu1Courses,
        wpu2Courses
    };
});
