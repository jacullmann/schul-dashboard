import { ref } from 'vue';
import type { HwItem } from '@/modules/tasks/types';
import type { ItemType } from '@/modules/tasks/types';

// Module-level singleton — shared across all composable call-sites.
const isItemFormOpen = ref(false);
const itemToEdit = ref<HwItem | null>(null);
const itemFormKey = ref(0);
// Default type shown when opening a fresh create form
const initialType = ref<Exclude<ItemType, 'all'>>('homework');

// Registry of success callbacks registered by active pages/features.
// Using a Set so multiple consumers can each register their own reload logic.
const successCallbacks = new Set<() => void>();

export function useItemForm() {
  /** Open the form to create a new entry, optionally pre-selecting a type. */
  function openItemForm(type: Exclude<ItemType, 'all'> = 'homework') {
    itemToEdit.value = null;
    initialType.value = type;
    itemFormKey.value += 1;
    isItemFormOpen.value = true;
  }

  /** Open the form pre-filled with an existing entry for editing. */
  function openEditForm(item: HwItem) {
    itemToEdit.value = item;
    initialType.value = item.type;
    itemFormKey.value += 1;
    isItemFormOpen.value = true;
  }

  function closeItemForm() {
    isItemFormOpen.value = false;
  }

  /**
   * Called by the global @success handler (App.vue). Runs all registered
   * callbacks (e.g. reloadList from useTasks) and then closes the form.
   */
  function notifySuccess() {
    successCallbacks.forEach((cb) => cb());
    closeItemForm();
  }

  /**
   * Register a callback to run when the form emits 'success'.
   * Returns an unregister function to call on component unmount.
   */
  function onFormSuccess(cb: () => void): () => void {
    successCallbacks.add(cb);
    return () => successCallbacks.delete(cb);
  }

  return {
    isItemFormOpen,
    itemToEdit,
    itemFormKey,
    initialType,
    openItemForm,
    openEditForm,
    closeItemForm,
    notifySuccess,
    onFormSuccess,
  };
}
