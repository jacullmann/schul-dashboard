import { useModalStore } from '@/stores/modalStore';
import type { HwItem, ItemType } from '@/modules/tasks/types';

export function useTaskForm() {
  const store = useModalStore();

  return {
    isTaskFormOpen: store.taskFormOpen as Readonly<typeof store.taskFormOpen>,
    taskToEdit: store.taskToEdit as Readonly<typeof store.taskToEdit>,
    taskFormKey: store.taskFormKey,
    initialType: store.taskFormInitialType as Readonly<
      typeof store.taskFormInitialType
    >,
    openTaskForm: (groupId: string, type?: Exclude<ItemType, 'all'>) =>
      store.openTaskForm(groupId, type),
    openEditForm: (groupId: string, item: HwItem) =>
      store.openEditForm(groupId, item),
    closeTaskForm: store.closeTaskForm,
    notifySuccess: store.notifyTaskFormSuccess,
    onFormSuccess: store.onTaskFormSuccess,
  };
}
