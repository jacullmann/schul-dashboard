import { ref } from 'vue';
import type { Ref } from 'vue';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';

export function useHwForms(
  user: Ref<Record<string, unknown> | null>,
  items: Ref<HwItem[]>,
  reloadList: () => void,
) {
  const itemFormType = ref<Exclude<ItemType, 'all'>>('homework');
  const showItemForm = ref(false);
  const itemToEdit = ref<HwItem | null>(null);
  const itemFormKey = ref(0);

  const editingNoteForId = ref<string | null>(null);
  const noteEditContent = ref('');
  const savingNote = ref(false);

  function onItemFormError(msg: string) {
    useToast().error(msg || 'Bitte Eingaben prüfen.');
  }

  function handleSuccess(msg: string) {
    useToast().success(msg);
    itemFormKey.value += 1;
    showItemForm.value = false;
    reloadList();
  }

  function editItem(item: HwItem) {
    itemToEdit.value = item;
    itemFormType.value = item.type;
    showItemForm.value = true;
  }

  function openCreateFormByType(type: Exclude<ItemType, 'all'>) {
    itemToEdit.value = null;
    itemFormType.value = type;
    showItemForm.value = true;
  }

  function canEditNote() {
    return user.value?.role === 'superadmin';
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

      const item = items.value.find((i) => i.id === itemId);
      if (item) item.editorNote = noteEditContent.value;

      useToast().success('Anmerkung gespeichert.');
      editingNoteForId.value = null;
      noteEditContent.value = '';
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      useToast().error(
        err.response?.data?.error || 'Fehler beim Speichern der Anmerkung.',
      );
    } finally {
      savingNote.value = false;
    }
  }

  return {
    itemFormType,
    showItemForm,
    itemToEdit,
    itemFormKey,
    editingNoteForId,
    noteEditContent,
    savingNote,
    onItemFormError,
    handleSuccess,
    editItem,
    openCreateFormByType,
    canEditNote,
    startEditNote,
    cancelEditNote,
    saveNote,
  };
}
