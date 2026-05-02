import { ref, watch, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/hwApi';
import { useModalStore } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';
import type { PrivateTask } from '@/modules/tasks/types';
import { useToast } from '@/common/composables/useToast';

export function usePrivateTasks() {
  const { t } = useI18n();
  const userStore = useUserStore();
  const modalStore = useModalStore();
  const { user } = storeToRefs(userStore);

  const privateTasks = ref<PrivateTask[]>([]);
  const displayPrivateTasks = ref<PrivateTask[]>([]);
  const loading = ref(false);
  const openMenuId = ref<string | null>(null);

  const sortDisplayList = (data: PrivateTask[]) =>
    [...data].sort((a, b) => {
      const posA = a.position || null;
      const posB = b.position || null;
      if (posA && posB) return posA < posB ? -1 : posA > posB ? 1 : 0;
      if (posA && !posB) return -1;
      if (!posA && posB) return 1;
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const syncState = () => {
    displayPrivateTasks.value = sortDisplayList(privateTasks.value);
  };

  const addPrivateTask = (task: PrivateTask) => {
    privateTasks.value.unshift(task);
    syncState();
  };

  const updatePrivateTask = (task: PrivateTask) => {
    const idx = privateTasks.value.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      const current = privateTasks.value[idx];
      if (current) {
        privateTasks.value[idx] = { ...current, ...task };
        syncState();
      }
    }
  };

  const toggleMenu = (id: string) => {
    openMenuId.value = openMenuId.value === id ? null : id;
  };

  const closeMenu = () => {
    openMenuId.value = null;
  };

  useEventListener(document, 'click', closeMenu);

  const loadPrivateTasks = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
      const { data } = await hw.get('/api/todos');
      privateTasks.value = data;
      syncState();
    } catch {
      useToast().error(t('school.private.errorLoad'));
    } finally {
      loading.value = false;
    }
  };

  const togglePrivateTaskCompletion = async (task: PrivateTask) => {
    const previous = task.completed;
    task.completed = !task.completed;
    try {
      const { data } = await hw.patch(`/api/todos/${task.id}/toggle`);
      updatePrivateTask({ ...task, updatedAt: data.updatedAt });
    } catch (e: any) {
      task.completed = previous;
      useToast().error(e.response?.data?.error || t('global.errors.update'));
    }
  };

  const duplicatePrivateTask = async (task: PrivateTask) => {
    loading.value = true;
    try {
      const { data } = await hw.post('/api/todos', {
        title: task.title,
        description: task.description,
        completed: false,
      });
      addPrivateTask(data);
      useToast().success(t('school.private.successDuplicate'));
    } catch (e: any) {
      useToast().error(
        e.response?.data?.error || t('school.private.errorDuplicate'),
      );
    } finally {
      loading.value = false;
    }
  };

  const deletePrivateTask = async (id: string) => {
    if (
      !(await modalStore.confirm({
        title: t('school.tasks.items.menu.delete.title'),
        content: t('school.private.deleteConfirm'),
        submitText: t('global.buttons.delete'),
        danger: true,
      }))
    )
      return;

    const idx = privateTasks.value.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const backup = privateTasks.value[idx];
    if (!backup) return;

    privateTasks.value.splice(idx, 1);
    syncState();

    try {
      await hw.delete(`/api/todos/${id}`);
      useToast().success(t('school.private.successDelete'));
    } catch (e: any) {
      privateTasks.value.splice(idx, 0, backup);
      syncState();
      useToast().error(e.response?.data?.error || t('global.errors.delete'));
    }
  };

  const reorderPrivateTask = async (
    id: string,
    prevPosition: string | null,
    nextPosition: string | null,
  ) => {
    const idx = privateTasks.value.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const task = privateTasks.value[idx];
    if (!task) return;

    if (prevPosition) task.position = prevPosition + 'z';
    else if (nextPosition) task.position = nextPosition + '0';

    syncState();

    try {
      const { data } = await hw.patch(`/api/todos/${id}/reorder`, {
        prevPosition,
        nextPosition,
      });
      updatePrivateTask({
        ...task,
        position: data.position,
        updatedAt: data.updatedAt,
      });
    } catch (e: any) {
      void loadPrivateTasks();
      useToast().error(e.response?.data?.error || t('global.errors.update'));
    }
  };

  onMounted(() => {
    if (user.value) {
      void loadPrivateTasks();
    }
  });

  watch(
    user,
    (u) => {
      if (u) {
        void loadPrivateTasks();
      } else {
        privateTasks.value = [];
        syncState();
      }
    },
    { immediate: true },
  );

  return {
    user,
    privateTasks,
    displayPrivateTasks,
    loading,
    openMenuId,
    loadPrivateTasks,
    addPrivateTask,
    updatePrivateTask,
    toggleMenu,
    togglePrivateTaskCompletion,
    duplicatePrivateTask,
    deletePrivateTask,
    reorderPrivateTask,
  };
}
