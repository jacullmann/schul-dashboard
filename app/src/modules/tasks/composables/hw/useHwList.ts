import { computed, nextTick } from 'vue';
import type { HwContext } from './types';
import hw from '@/api/api.ts';
import { useSubjectStore } from '@/stores/subjectStore';
import { getSubjectKey } from '@/types/subjects';

export function useHwList(ctx: HwContext) {
  const subjectStore = useSubjectStore();

  const userSubjects = computed(() => {
    return new Set<string>();
  });

  const filteredItems = computed(() => {
    const pins = ctx.pinnedItems.value;
    const checks = ctx.checkedItems.value;
    const hideChecked = ctx.hideChecked.value;

    let pinnedList: typeof ctx.items.value = [];
    const unpinnedList: typeof ctx.items.value = [];

    for (const item of ctx.items.value) {
      if (hideChecked && checks.has(item.id)) {
        continue;
      }
      (pins.has(item.id) ? pinnedList : unpinnedList).push(item);
    }

    return [...pinnedList, ...unpinnedList];
  });

  const limitedItems = computed(() =>
    filteredItems.value.slice(0, ctx.visibleCount.value),
  );

  function setVisibleCount(count: number) {
    ctx.visibleCount.value = count;
  }

  function showMore() {
    ctx.visibleCount.value = Math.min(
      ctx.visibleCount.value + 5,
      filteredItems.value.length,
    );
  }

  function showLess() {
    ctx.visibleCount.value = Math.max(5, ctx.visibleCount.value - 5);
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

  async function checkAndScrollToItem(
    targetId: string | undefined,
    forceOldEntries: () => void,
  ) {
    if (!targetId) {
      ctx.highlightedItemId.value = null;
      return;
    }

    const existsInRaw = ctx.items.value.some((i) => i.id === targetId);

    if (!existsInRaw) {
      if (!ctx.showOldEntries.value) {
        forceOldEntries();
        return;
      }
      return;
    }

    let index = filteredItems.value.findIndex((i) => i.id === targetId);

    if (index === -1 && ctx.subjectFilter.value) {
      ctx.subjectFilter.value = '';
      await nextTick();
      index = filteredItems.value.findIndex((i) => i.id === targetId);
    }

    if (index === -1) return;

    ctx.highlightedItemId.value = targetId;

    if (index >= ctx.visibleCount.value) {
      ctx.visibleCount.value = index + 5;
      await nextTick();
    }

    const el = document.getElementById(`item-${targetId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function reloadList(
    routeParamsItemId?: string,
    forceOldEntries?: () => void,
  ) {
    if ((ctx.tab.value as string) === 'PRIVATE') {
      ctx.loading.value = false;
      ctx.items.value = [];
      ctx.expandedDescriptions.value = new Set();
      ctx.revealedImages.value = new Set();
      ctx.visibleCount.value = 5;
      return;
    }

    ctx.loading.value = true;
    const params: Record<string, string | boolean> = { type: ctx.tab.value };
    if (ctx.showOldEntries.value) params.filter = 'old';
    if (ctx.subjectFilter.value) params.subject = ctx.subjectFilter.value;
    if (ctx.hideChecked.value) params.hide_checked = true;
    if (ctx.showPersonalized.value) params.personalized = true;

    try {
      const { data } = await hw.get('/items', { params });
      ctx.items.value = data;
      ctx.expandedDescriptions.value = new Set();
      ctx.revealedImages.value = new Set();
    } catch (e) {
      console.error('Failed to load items:', e);
    } finally {
      ctx.loading.value = false;
      ctx.initialLoad.value = false;

      if (!routeParamsItemId) {
        ctx.visibleCount.value = Math.min(5, filteredItems.value.length || 5);
      }

      if (routeParamsItemId && forceOldEntries) {
        await checkAndScrollToItem(routeParamsItemId, forceOldEntries);
      }
    }
  }

  async function refreshItem(itemId: string, onUpdate?: (item: any) => void) {
    try {
      const { data } = await hw.get(`/items/${itemId}`);
      const index = ctx.items.value.findIndex((i) => i.id === itemId);
      if (index !== -1) {
        ctx.items.value[index] = data;
      }
      if (onUpdate) onUpdate(data);
    } catch (e) {
      console.error(`Failed to refresh item ${itemId}:`, e);
    }
  }

  return {
    filteredItems,
    limitedItems,
    setVisibleCount,
    showMore,
    showLess,
    loadCheckedForMe,
    loadVisibilityForMe,
    reloadList,
    refreshItem,
    checkAndScrollToItem,
  };
}
