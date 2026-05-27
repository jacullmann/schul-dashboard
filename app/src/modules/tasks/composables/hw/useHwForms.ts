import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import hw from '@/api/api.ts';
import { useToast } from '@/common/composables/useToast';
import { useItemForm } from '@/core/composables/useItemForm';
import { useModalStore } from '@/stores/modalStore';
import type { HwContext } from './types';

export function useHwForms(ctx: HwContext) {
  const { t } = useI18n();
  const { openItemForm, openEditForm, onFormSuccess } = useItemForm();

  const unregister = onFormSuccess(() => ctx.reloadList());
  onUnmounted(unregister);

  const editingNoteForId = ref<string | null>(null);
  const noteEditContent = ref('');
  const savingNote = ref(false);

  function onItemFormError(msg: string) {
    useToast().error(msg || t('common.errors.validation_failed'));
  }

  function editItem(item: HwItem) {
    openEditForm(item);
  }

  function openCreateFormByType(type: Exclude<ItemType, 'all'>) {
    openItemForm(type);
  }

  function canEditNote() {
    if (!ctx.user.value) return false;
    return (
      ctx.user.value.role === 'superadmin' ||
      ctx.user.value.tenantRole === 'admin' ||
      ctx.user.value.tenantRole === 'moderator'
    );
  }

  function startEditNote(item: HwItem) {
    editingNoteForId.value = item.id;
    noteEditContent.value = item.editorNote || '';
  }

  function cancelEditNote() {
    editingNoteForId.value = null;
    noteEditContent.value = '';
  }

  async function saveNote(itemId: string) {
    if (savingNote.value) return;
    savingNote.value = true;

    try {
      await hw.patch(`/items/${itemId}/note`, {
        editorNote: noteEditContent.value,
      });

      const item = ctx.items.value.find((i) => i.id === itemId);
      if (item) item.editorNote = noteEditContent.value;

      useToast().success('Anmerkung gespeichert.');
      editingNoteForId.value = null;
      noteEditContent.value = '';
    } catch (e: any) {
      useToast().error(
        e.response?.data?.error || 'Fehler beim Speichern der Anmerkung.',
      );
    } finally {
      savingNote.value = false;
    }
  }

  async function deleteNote(itemId: string) {
    const modalStore = useModalStore();
    const isConfirmed = await modalStore.confirm({
      title: t('tasks.notes.delete_modal.title'),
      content:
        t('tasks.notes.delete_modal.message'),
      submitText: t('tasks.notes.delete_modal.submit'),
      danger: true,
    });

    if (!isConfirmed) return;

    if (savingNote.value) return;
    savingNote.value = true;

    try {
      await hw.patch(`/items/${itemId}/note`, {
        editorNote: '',
      });

      const item = ctx.items.value.find((i) => i.id === itemId);
      if (item) item.editorNote = '';

      useToast().success(t('tasks.notes.delete_modal.success'));
    } catch (e: any) {
      useToast().error(
        e.response?.data?.error || t('tasks.notes.delete_modal.error'),
      );
    } finally {
      savingNote.value = false;
    }
  }

  return {
    editingNoteForId,
    noteEditContent,
    savingNote,
    onItemFormError,
    editItem,
    openCreateFormByType,
    canEditNote,
    startEditNote,
    cancelEditNote,
    saveNote,
    deleteNote,
  };
}
