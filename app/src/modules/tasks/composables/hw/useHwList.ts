import { computed, nextTick } from 'vue';
import type { HwContext } from './types';
import hw from '@/api/api.ts';
import { useSubjectStore } from '@/stores/subjectStore';
import { getSubjectKey } from '@/types/subjects';

export function useHwList(ctx: HwContext) {
  const subjectStore = useSubjectStore();

  const userSubjects = computed(() => {
    const subjects = new Set<string>();
    if (
      !ctx.showPersonalized.value ||
      !ctx.user.value?.doneSetup ||
      !Array.isArray(ctx.user.value.courses)
    )
      return subjects;

    ctx.user.value.courses.forEach((c: any) => {
      const subject = subjectStore.subjects.find((s) => s.id === c.subjectId);
      if (!subject) return;
      const course = subject.courses?.find((csc) => csc.id === c.courseId);
      if (course) {
        subjects.add(`${subject.name} - ${course.name}`);
        if (subject.category === 'extra' && subject.courses?.length === 1) {
          subjects.add(subject.name);
        }
      }
    });
    return subjects;
  });

  const filteredItems = computed(() => {
    const pins = ctx.pinnedItems.value;
    let pinnedList: typeof ctx.items.value = [];
    const unpinnedList: typeof ctx.items.value = [];

    for (const item of ctx.items.value) {
      (pins.has(item.id) ? pinnedList : unpinnedList).push(item);
    }

    let list = unpinnedList;
    const filter = ctx.subjectFilter.value;

    if (filter) {
      const parentCategories = ['enrichment', 'wpu1', 'wpu2'];
      const filterLower = filter.toLowerCase();

      list = parentCategories.includes(filterLower)
        ? list.filter((i) => {
            const subjLower = i.subject.toLowerCase();
            return (
              subjLower.startsWith(filterLower) ||
              (filterLower === 'enrichment' &&
                subjLower.startsWith('enrichment')) ||
              (filterLower === 'wpu1' && subjLower.startsWith('wpu (di)')) ||
              (filterLower === 'wpu2' && subjLower.startsWith('wpu (do)'))
            );
          })
        : list.filter(
            (i) =>
              i.subject.toLowerCase() === filterLower ||
              getSubjectKey(i.subject) === filterLower ||
              getSubjectKey(i.subject).toLowerCase() === filterLower,
          );
    }

    if (ctx.showPersonalized.value && userSubjects.value.size > 0) {
      list = list.filter((item) => {
        const subjectLower = item.subject.toLowerCase();
        const subjectName = subjectLower.split(' - ')[0]?.trim();
        const categoryMatch = subjectStore.subjects.find(
          (s) => s.name.toLowerCase() === subjectName,
        );

        if (
          categoryMatch &&
          categoryMatch.category !== 'core' &&
          categoryMatch.courses &&
          categoryMatch.courses.length > 0
        ) {
          return userSubjects.value.has(item.subject);
        }
        return true;
      });
    }

    if (ctx.hideChecked.value) {
      list = list.filter((item) => !ctx.checkedItems.value.has(item.id));
      pinnedList = pinnedList.filter(
        (item) => !ctx.checkedItems.value.has(item.id),
      );
    }

    return [...pinnedList, ...list];
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
    const params: Record<string, string> = { type: ctx.tab.value };
    if (ctx.showOldEntries.value) params.filter = 'old';

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
