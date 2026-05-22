import { useModalStore } from '@/stores/modalStore';
import type { HwItem } from '@/modules/tasks/types';
export function useItemForm() {
  const store = useModalStore();

  return {
    isItemFormOpen: store.itemFormOpen as Readonly<typeof store.itemFormOpen>,
    itemToEdit: store.itemToEdit as Readonly<typeof store.itemToEdit>,
    itemFormKey: store.itemFormKey,
    initialType: store.itemFormInitialType as Readonly<
      typeof store.itemFormInitialType
    >,
    openItemForm: store.openItemForm,
    openEditForm: (item: HwItem) => store.openEditForm(item),
    closeItemForm: store.closeItemForm,
    notifySuccess: store.notifyItemFormSuccess,
    onFormSuccess: store.onItemFormSuccess,
  };
}
