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

  return {
    subjects,
    loading,
    saving,
    loadSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}
