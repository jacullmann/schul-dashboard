import { ref, watch, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/api.ts';
import { useModalStore } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';
import type { PrivateTask } from '@/modules/tasks/types';
import { useToast } from '@/common/composables/useToast';

/**
 * A key that sorts strictly between two positions, so a moved task lands in
 * its slot straight away instead of wherever a guessed key happens to sort
 * until the server answers with the real one. Appending a character, as the
 * obvious shortcut, sorts after the key it extends and can overshoot the
 * neighbour on the other side.
 */
function positionBetween(prev: string | null, next: string | null): string {
  const lower = prev ?? '';
  let upper = next;
  let key = '';

  for (let i = 0; i < lower.length + (upper?.length ?? 0) + 1; i++) {
    const lo = i < lower.length ? lower.charCodeAt(i) : 0;
    const hi =
      upper !== null && i < upper.length ? upper.charCodeAt(i) : 0x10000;

    if (lo === hi) {
      key += String.fromCharCode(lo);
      continue;
    }

    const mid = (lo + hi) >> 1;
    if (mid > lo) return key + String.fromCharCode(mid);

    // Adjacent characters leave no room here; anything after `lower` at this
    // depth already sorts below `upper`.
    key += String.fromCharCode(lo);
    upper = null;
  }

  return key;
}

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
      const { data } = await hw.get('/todos');
      privateTasks.value = data;
      syncState();
    } catch {
      useToast().error(t('tasks.private_tasks.error_load'));
    } finally {
      loading.value = false;
    }
  };

  const togglePrivateTaskCompletion = async (task: PrivateTask) => {
    const previous = task.completed;
    task.completed = !task.completed;
    try {
      const { data } = await hw.patch(`/todos/${task.id}/toggle`);
      updatePrivateTask({ ...task, updatedAt: data.updatedAt });
    } catch (e: any) {
      task.completed = previous;
      useToast().error(e.response?.data?.error || t('common.errors.update'));
    }
  };

  const duplicatePrivateTask = async (task: PrivateTask) => {
    loading.value = true;
    try {
      const { data } = await hw.post('/todos', {
        title: task.title,
        description: task.description,
        completed: false,
      });
      addPrivateTask(data);
      useToast().success(t('tasks.private_tasks.success_duplicate'));
    } catch (e: any) {
      useToast().error(
        e.response?.data?.error || t('tasks.private_tasks.error_duplicate'),
      );
    } finally {
      loading.value = false;
    }
  };

  const deletePrivateTask = async (id: string) => {
    if (
      !(await modalStore.confirm({
        title: t('tasks.list.tasks.menu.delete.title'),
        content: t('tasks.private_tasks.delete_confirm'),
        submitText: t('common.buttons.delete'),
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
      await hw.delete(`/todos/${id}`);
      useToast().success(t('tasks.private_tasks.success_delete'));
    } catch (e: any) {
      privateTasks.value.splice(idx, 0, backup);
      syncState();
      useToast().error(e.response?.data?.error || t('common.errors.delete'));
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

    if (prevPosition || nextPosition) {
      task.position = positionBetween(prevPosition, nextPosition);
    }

    syncState();

    try {
      const { data } = await hw.patch(`/todos/${id}/reorder`, {
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
      useToast().error(e.response?.data?.error || t('common.errors.update'));
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
