import { useModalStore } from '@/stores/modalStore';
import type { PrivateTask } from '@/modules/tasks/types';

export function usePrivateTaskForm() {
  const store = useModalStore();

  return {
    isPrivateTaskFormOpen: store.privateTaskFormOpen as Readonly<
      typeof store.privateTaskFormOpen
    >,
    privateTaskToEdit: store.privateTaskToEdit as Readonly<
      typeof store.privateTaskToEdit
    >,
    privateTaskFormKey: store.privateTaskFormKey,
    openPrivateTaskForm: store.openPrivateTaskForm,
    openEditPrivateTaskForm: (task: PrivateTask) =>
      store.openEditPrivateTaskForm(task),
    closePrivateTaskForm: store.closePrivateTaskForm,
    notifySuccess: store.notifyPrivateTaskFormSuccess,
    onFormSuccess: store.onPrivateTaskFormSuccess,
  };
}
