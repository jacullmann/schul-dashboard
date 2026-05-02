import { onUnmounted, ref } from 'vue';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';
import { useItemForm } from '@/core/composables/useItemForm';
import type { HwContext } from './types';

export function useHwForms(ctx: HwContext) {
  const { openItemForm, openEditForm, onFormSuccess } = useItemForm();

  const unregister = onFormSuccess(() => ctx.reloadList());
  onUnmounted(unregister);

  const editingNoteForId = ref<string | null>(null);
  const noteEditContent = ref('');
  const savingNote = ref(false);

  function onItemFormError(msg: string) {
    useToast().error(msg || 'Bitte Eingaben prüfen.');
  }

  function editItem(item: HwItem) {
    openEditForm(item);
  }

  function openCreateFormByType(type: Exclude<ItemType, 'all'>) {
    openItemForm(type);
  }

  function canEditNote() {
    return ctx.user.value?.role === 'superadmin';
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
      await hw.patch(`/api/items/${itemId}/note`, {
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
  };
}
