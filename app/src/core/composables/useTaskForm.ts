import { useModalStore } from '@/stores/modalStore';
import type { HwItem } from '@/modules/tasks/types';
import type { TaskFormOptions } from '@/stores/modalStore';

export function useTaskForm() {
  const store = useModalStore();

  return {
    isTaskFormOpen: store.taskFormOpen as Readonly<typeof store.taskFormOpen>,
    taskToEdit: store.taskToEdit as Readonly<typeof store.taskToEdit>,
    taskFormKey: store.taskFormKey,
    initialType: store.taskFormInitialType as Readonly<
      typeof store.taskFormInitialType
    >,
    openTaskForm: (groupId: string, options?: TaskFormOptions) =>
      store.openTaskForm(groupId, options),
    openEditForm: (groupId: string, item: HwItem) =>
      store.openEditForm(groupId, item),
    closeTaskForm: store.closeTaskForm,
    notifySuccess: store.notifyTaskFormSuccess,
    onFormSuccess: store.onTaskFormSuccess,
  };
}
