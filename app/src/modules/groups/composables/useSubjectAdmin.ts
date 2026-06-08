import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import type { AdminSubject } from '@/modules/groups/types';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';

const subjects = ref<AdminSubject[]>([]);
const loading = ref(false);
const saving = ref(false);

export function useSubjectAdmin() {
  const { t } = useI18n();
  const modalStore = useModalStore();
  const { success, error: toastError } = useToast();

  async function loadSubjects() {
    loading.value = true;
    subjects.value = [];
    try {
      const { data } = await hw.get<AdminSubject[]>('/group-admin/subjects');
      subjects.value = data || [];
    } catch {
      toastError(t('groups.settings.subjects.errors.load_failed'));
    } finally {
      loading.value = false;
    }
  }

  async function createSubject(name: string, category?: string) {
    if (!name.trim()) return;
    saving.value = true;
    try {
      const { data } = await hw.post<AdminSubject>('/group-admin/subjects', {
        name: name.trim(),
        category,
      });
      subjects.value.push(data);
      subjects.value.sort((a, b) => a.name.localeCompare(b.name));
      success(t('groups.settings.subjects.errors.create_success'));
    } catch {
      toastError(t('groups.settings.subjects.errors.create_failed'));
    } finally {
      saving.value = false;
    }
  }

  async function updateSubject(
    id: string,
    updates: { name?: string; category?: string },
  ): Promise<boolean> {
    saving.value = true;
    try {
      await hw.patch(`/group-admin/subjects/${id}`, updates);
      const subject = subjects.value.find((s) => s.id === id);
      if (subject) {
        if (updates.name !== undefined) subject.name = updates.name.trim();
        if (updates.category !== undefined) subject.category = updates.category;
      }
      if (updates.name !== undefined) {
        subjects.value.sort((a, b) => a.name.localeCompare(b.name));
      }
      success(t('groups.settings.subjects.errors.update_success'));
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(
        err.response?.data?.message ||
          t('groups.settings.subjects.errors.update_failed'),
      );
      await loadSubjects();
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function deleteSubject(id: string): Promise<boolean> {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.subjects.delete_modal.title'),
      content: t('groups.settings.subjects.delete_modal.message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return false;
    try {
      await hw.delete(`/group-admin/subjects/${id}`);
      subjects.value = subjects.value.filter((s) => s.id !== id);
      success(t('groups.settings.subjects.errors.delete_success'));
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(
        err.response?.data?.message ||
          t('groups.settings.subjects.errors.delete_failed'),
      );
      return false;
    }
  }

  async function createCourse(
    subjectId: string,
    name: string,
  ): Promise<boolean> {
    if (!name.trim()) return false;
    saving.value = true;
    try {
      const { data } = await hw.post<{
        id: string;
        name: string;
        subjectId: string;
      }>(`/group-admin/subjects/${subjectId}/courses`, { name: name.trim() });
      const subject = subjects.value.find((s) => s.id === subjectId);
      if (subject) {
        if (!subject.courses) subject.courses = [];
        subject.courses.push({ id: data.id, name: data.name });
        subject.courses.sort((a, b) => a.name.localeCompare(b.name));
        subject.coursesCount = (subject.coursesCount || 0) + 1;
      }
      success(t('groups.settings.subjects.errors.course_create_success'));
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(
        err.response?.data?.message ||
          t('groups.settings.subjects.errors.course_create_failed'),
      );
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function updateCourse(
    subjectId: string,
    courseId: string,
    name: string,
  ): Promise<boolean> {
    if (!name.trim()) return false;
    saving.value = true;
    try {
      await hw.patch(`/group-admin/courses/${courseId}`, { name: name.trim() });
      const subject = subjects.value.find((s) => s.id === subjectId);
      if (subject && subject.courses) {
        const course = subject.courses.find((c) => c.id === courseId);
        if (course) {
          course.name = name.trim();
        }
        subject.courses.sort((a, b) => a.name.localeCompare(b.name));
      }
      success(t('groups.settings.subjects.errors.course_update_success'));
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(
        err.response?.data?.message ||
          t('groups.settings.subjects.errors.course_update_failed'),
      );
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function deleteCourse(
    subjectId: string,
    courseId: string,
  ): Promise<boolean> {
    const isConfirmed = await modalStore.confirm({
      title: t('groups.settings.subjects.course_delete_modal.title'),
      content: t('groups.settings.subjects.course_delete_modal.message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return false;
    saving.value = true;
    try {
      await hw.delete(`/group-admin/courses/${courseId}`);
      const subject = subjects.value.find((s) => s.id === subjectId);
      if (subject && subject.courses) {
        subject.courses = subject.courses.filter((c) => c.id !== courseId);
        subject.coursesCount = Math.max(0, (subject.coursesCount || 1) - 1);
      }
      success(t('groups.settings.subjects.errors.course_delete_success'));
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(
        err.response?.data?.message ||
          t('groups.settings.subjects.errors.course_delete_failed'),
      );
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    subjects,
    loading,
    saving,
    loadSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}
