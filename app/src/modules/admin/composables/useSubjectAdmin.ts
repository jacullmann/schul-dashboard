import { ref } from 'vue';
import hw from '@/api/hwApi';
import type { AdminSubject } from '@/modules/admin/types';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';

export function useSubjectAdmin() {
  const modalStore = useModalStore();
  const { success, error: toastError } = useToast();

  const subjects = ref<AdminSubject[]>([]);
  const loading = ref(false);
  const saving = ref(false);

  async function loadSubjects() {
    loading.value = true;
    try {
      const { data } = await hw.get<AdminSubject[]>(
        '/api/group-admin/subjects',
      );
      subjects.value = data || [];
    } catch {
      toastError('Fehler beim Laden der Fächer');
    } finally {
      loading.value = false;
    }
  }

  async function createSubject(name: string) {
    if (!name.trim()) return;
    saving.value = true;
    try {
      const { data } = await hw.post<AdminSubject>(
        '/api/group-admin/subjects',
        {
          name: name.trim(),
        },
      );
      subjects.value.push(data);
      subjects.value.sort((a, b) => a.name.localeCompare(b.name));
      success('Fach erstellt');
    } catch {
      toastError('Fehler beim Erstellen');
    } finally {
      saving.value = false;
    }
  }

  async function updateSubject(
    id: string,
    updates: { name?: string; isActive?: boolean },
  ) {
    saving.value = true;
    try {
      await hw.patch(`/api/group-admin/subjects/${id}`, updates);
      const subject = subjects.value.find((s) => s.id === id);
      if (subject) {
        if (updates.name !== undefined) subject.name = updates.name.trim();
        if (updates.isActive !== undefined) subject.isActive = updates.isActive;
      }
      if (updates.name !== undefined) {
        subjects.value.sort((a, b) => a.name.localeCompare(b.name));
      }
      success('Fach aktualisiert');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err.response?.data?.message || 'Fehler beim Aktualisieren');
      await loadSubjects();
    } finally {
      saving.value = false;
    }
  }

  async function deleteSubject(id: string) {
    const isConfirmed = await modalStore.confirm({
      title: 'Dieses Fach löschen?',
      content:
        'Fach wirklich löschen? Falls es noch referenziert wird, schlage stattdessen eine Deaktivierung vor.',
      submitText: 'Löschen',
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.delete(`/api/group-admin/subjects/${id}`);
      subjects.value = subjects.value.filter((s) => s.id !== id);
      success('Fach gelöscht');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err.response?.data?.message || 'Fehler beim Löschen');
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
