import { computed, ref, watch } from 'vue';
import { isAxiosError } from 'axios';
import type { HwItem } from '@/modules/tasks/types';
import hw from '@/api/api.ts';
import { groupPath } from '@/api/groupPath';
import { useTaskFormModal } from '@/stores/modalStore';
import type { HwContext } from './types';

export type OpenedItemError = 'not-found' | 'failed';

export function useHwDetail(ctx: HwContext) {
  const taskFormModal = useTaskFormModal();
  const openedItemError = ref<OpenedItemError | null>(null);

  const listCopy = computed(() =>
    ctx.openedItemId.value
      ? ctx.items.value.find((item) => item.id === ctx.openedItemId.value)
      : undefined,
  );

  // The list's copy is the one every action keeps up to date, so it takes over
  // whenever the list holds the task, also after a reload replaced it.
  watch(listCopy, (item) => {
    if (item) ctx.openedItem.value = item;
  });

  async function fetchOpenedItem(itemId: string) {
    try {
      const { data } = await hw.get<HwItem>(
        groupPath(ctx.groupId, `/items/${itemId}`),
      );
      if (ctx.openedItemId.value !== itemId) return;
      ctx.openedItem.value = listCopy.value ?? data;
    } catch (e) {
      if (ctx.openedItemId.value !== itemId) return;
      openedItemError.value =
        isAxiosError(e) && e.response?.status === 404 ? 'not-found' : 'failed';
    }
  }

  function loadOpenedItem() {
    const itemId = ctx.openedItemId.value;
    openedItemError.value = null;
    ctx.openedItem.value = listCopy.value ?? null;
    // Opened from a link, the task is fetched alongside the list rather than
    // after it, and may not be part of it at all.
    if (itemId && !listCopy.value) void fetchOpenedItem(itemId);
  }

  watch(ctx.openedItemId, loadOpenedItem, { immediate: true });

  // An edit reloads the list, which misses a task it does not hold.
  taskFormModal.onSuccess(() => {
    const itemId = ctx.openedItemId.value;
    if (itemId && !listCopy.value) void ctx.refreshItem(itemId);
  });

  return {
    openedItemError,
    retryOpenedItem: loadOpenedItem,
  };
}
