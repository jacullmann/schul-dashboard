import { computed } from 'vue';
import type { HwItem } from '@/modules/tasks/types';
import type { HwContext } from './types';
import hw from '@/api/api.ts';
import { groupPath } from '@/api/groupPath';
import { hiddenByCourses } from '@/api/personalization';

/** Tasks shown at first, and added each time the list is scrolled to its end. */
export const TASK_PAGE_SIZE = 10;

export function useHwList(ctx: HwContext) {
  const filteredItems = computed(() => {
    const pins = ctx.pinnedItems.value;
    const checks = ctx.checkedItems.value;
    const hideChecked = ctx.hideChecked.value;
    const pendingRemovals = ctx.pendingCheckRemovals.value;

    const pinnedList: typeof ctx.items.value = [];
    const unpinnedList: typeof ctx.items.value = [];

    for (const item of ctx.items.value) {
      if (hideChecked && checks.has(item.id) && !pendingRemovals.has(item.id)) {
        continue;
      }
      (pins.has(item.id) ? pinnedList : unpinnedList).push(item);
    }

    return [...pinnedList, ...unpinnedList];
  });

  const limitedItems = computed(() =>
    filteredItems.value.slice(0, ctx.visibleCount.value),
  );

  function resetVisibleCount() {
    ctx.visibleCount.value = TASK_PAGE_SIZE;
  }

  const hasMoreItems = computed(
    () => ctx.visibleCount.value < filteredItems.value.length,
  );

  /** Shows the next page and returns the tasks it brought into view. */
  function showMore(): HwItem[] {
    const previousCount = ctx.visibleCount.value;
    ctx.visibleCount.value = Math.min(
      previousCount + TASK_PAGE_SIZE,
      filteredItems.value.length,
    );
    return filteredItems.value.slice(previousCount, ctx.visibleCount.value);
  }

  async function loadCheckedForMe() {
    ctx.checksLoading.value = true;
    if (!ctx.user.value) {
      ctx.checkedItems.value = new Set();
      ctx.checksLoading.value = false;
      return;
    }
    try {
      const { data } = await hw.get('/user/checks');
      ctx.checkedItems.value = new Set(data.itemIds || []);
    } catch {
      ctx.checkedItems.value = new Set();
    } finally {
      ctx.checksLoading.value = false;
    }
  }

  async function loadVisibilityForMe() {
    if (!ctx.user.value) {
      ctx.archivedItems.value = new Set();
      ctx.keptItems.value = new Set();
      return;
    }
    try {
      const { data } = await hw.get('/user/visibility');
      ctx.archivedItems.value = new Set(data.archived || []);
      ctx.keptItems.value = new Set(data.kept || []);
    } catch {
      ctx.archivedItems.value = new Set();
      ctx.keptItems.value = new Set();
    }
  }

  async function reloadList() {
    ctx.loading.value = true;
    const params: Record<string, string | boolean> = { type: ctx.tab.value };
    if (ctx.showOldEntries.value) params.filter = 'old';
    if (ctx.subjectFilter.value) params.subjectId = ctx.subjectFilter.value;
    if (ctx.hideChecked.value) params.hideChecked = true;
    if (ctx.showPersonalized.value) params.personalized = true;

    try {
      const response = await hw.get(groupPath(ctx.groupId, '/items'), {
        params,
      });
      ctx.items.value = response.data;
      ctx.hiddenByCourses.value = hiddenByCourses(response);
    } catch (e) {
      console.error('Failed to load items:', e);
    } finally {
      ctx.loading.value = false;
      ctx.initialLoad.value = false;
    }
  }

  async function refreshItem(itemId: string) {
    try {
      const { data } = await hw.get<HwItem>(
        groupPath(ctx.groupId, `/items/${itemId}`),
      );
      const index = ctx.items.value.findIndex((i) => i.id === itemId);
      if (index !== -1) ctx.items.value[index] = data;
      if (ctx.openedItem.value?.id === itemId) ctx.openedItem.value = data;
    } catch (e) {
      console.error(`Failed to refresh item ${itemId}:`, e);
    }
  }

  return {
    filteredItems,
    limitedItems,
    hasMoreItems,
    resetVisibleCount,
    showMore,
    loadCheckedForMe,
    loadVisibilityForMe,
    reloadList,
    refreshItem,
  };
}
