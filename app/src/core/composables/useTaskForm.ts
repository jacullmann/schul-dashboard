import { useModalStore } from '@/stores/modalStore';
import type { HwItem } from '@/modules/tasks/types';
export function useTaskForm() {
  const store = useModalStore();

  return {
    isTaskFormOpen: store.taskFormOpen as Readonly<typeof store.taskFormOpen>,
    taskToEdit: store.taskToEdit as Readonly<typeof store.taskToEdit>,
    taskFormKey: store.taskFormKey,
    initialType: store.taskFormInitialType as Readonly<
      typeof store.taskFormInitialType
    >,
    openTaskForm: store.openTaskForm,
    openEditForm: (item: HwItem) => store.openEditForm(item),
    closeTaskForm: store.closeTaskForm,
    notifySuccess: store.notifyTaskFormSuccess,
    onFormSuccess: store.onTaskFormSuccess,
  };
}
