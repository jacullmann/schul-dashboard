import { ref } from 'vue';
import type { Ref } from 'vue';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import hw from '@/api/hwApi';

export function useHwForms(
    user: Ref<any>,
    items: Ref<HwItem[]>,
    flashMessage: (text: string, error?: boolean, durationMs?: number) => void,
    reloadList: () => void
) {
    const itemFormType = ref<Exclude<ItemType, 'PRIVATE'>>('HAUSAUFGABE');
    const showItemForm = ref(false);
    const itemToEdit = ref<HwItem | null>(null);
    const itemFormKey = ref(0);

    const showTodoForm = ref(false);
    const todoToEdit = ref<any>(null);
    const todoAppRef = ref<any>(null);

    const editingNoteForId = ref<string | null>(null);
    const noteEditContent = ref('');
    const savingNote = ref(false);

    function onItemFormError(msg: string) {
        flashMessage(msg || 'Bitte Eingaben prüfen.', true);
    }

    function handleSuccess(msg: string) {
        flashMessage(msg);
        itemFormKey.value += 1;
        showItemForm.value = false;
        reloadList();
    }

    function editItem(item: HwItem) {
        itemToEdit.value = item;
        itemFormType.value = item.type as Exclude<ItemType, 'PRIVATE'>;
        showItemForm.value = true;
    }

    function openCreateFormByType(type: ItemType) {
        if (type === 'PRIVATE') {
            todoToEdit.value = null;
            showTodoForm.value = true;
        } else {
            itemToEdit.value = null;
            itemFormType.value = type as Exclude<ItemType, 'PRIVATE'>;
            showItemForm.value = true;
        }
    }

    function openEditTodo(todo: any) {
        todoToEdit.value = todo;
        showTodoForm.value = true;
    }

    function handleTodoSuccess(msg: string, data?: any) {
        flashMessage(msg);
        showTodoForm.value = false;
        if (todoAppRef.value && data) {
            if (todoToEdit.value) {
                todoAppRef.value.updateTodo(data);
            } else {
                todoAppRef.value.addTodo(data);
            }
        }
        todoToEdit.value = null;
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

            const item = items.value.find(i => i.id === itemId);
            if (item) item.editorNote = noteEditContent.value;

            flashMessage('Anmerkung gespeichert.');
            editingNoteForId.value = null;
            noteEditContent.value = '';
        } catch (e: any) {
            flashMessage(e.response?.data?.error || 'Fehler beim Speichern der Anmerkung.', true);
        } finally {
            savingNote.value = false;
        }
    }

    return {
        itemFormType,
        showItemForm,
        itemToEdit,
        itemFormKey,
        showTodoForm,
        todoToEdit,
        todoAppRef,
        editingNoteForId,
        noteEditContent,
        savingNote,
        onItemFormError,
        handleSuccess,
        editItem,
        openCreateFormByType,
        openEditTodo,
        handleTodoSuccess,
        canEditNote,
        startEditNote,
        cancelEditNote,
        saveNote
    };
}
