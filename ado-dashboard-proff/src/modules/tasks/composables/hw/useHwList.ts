import { ref, computed, nextTick } from 'vue';
import type { Ref } from 'vue';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import { getSubjectKey } from '@/types/subjects';
import hw from '@/api/hwApi';

export function useHwList(
    user: Ref<any>,
    tab: Ref<ItemType>,
    showOldEntries: Ref<boolean>,
    subjectFilter: Ref<string>,
    pinnedItems: Ref<Set<string>>,
    showPersonalized: Ref<boolean>,
    expandedDescriptions: Ref<Set<string>>,
    revealedImages: Ref<Set<string>>,
    highlightedItemId: Ref<string | null>
) {
    const items = ref<HwItem[]>([]);
    const loading = ref(true);
    const initialLoad = ref(true);
    const visibleCount = ref(5);
    const checkedItems = ref(new Set<string>());

    const filteredItems = computed(() => {
        const pins = pinnedItems.value;
        const pinnedList: HwItem[] = [];
        const unpinnedList: HwItem[] = [];

        for (const item of items.value) {
            (pins.has(item.id) ? pinnedList : unpinnedList).push(item);
        }

        let list = unpinnedList;
        const filter = subjectFilter.value;

        if (filter) {
            const parentCategories = ['enrichment', 'wpu1', 'wpu2'];
            const filterLower = filter.toLowerCase();

            list = parentCategories.includes(filterLower)
                ? list.filter(i => {
                    const subjLower = i.subject.toLowerCase();
                    return subjLower.startsWith(filterLower) ||
                        (filterLower === 'enrichment' && subjLower.startsWith('enrichment')) ||
                        (filterLower === 'wpu1' && subjLower.startsWith('wpu (di)')) ||
                        (filterLower === 'wpu2' && subjLower.startsWith('wpu (do)'));
                })
                : list.filter(i => i.subject.toLowerCase() === filterLower || getSubjectKey(i.subject) === filterLower || getSubjectKey(i.subject).toLowerCase() === filterLower);
        }

        if (showPersonalized.value && user.value?.doneSetup) {
            const enrName = String(user.value!.enrKurs);
            const wpu1Name = String(user.value!.wpuKurs1);
            const wpu2Name = String(user.value!.wpuKurs2);

            const userSubjects = new Set<string>();
            if (enrName && enrName !== '0' && enrName !== 'null') {
                userSubjects.add(`enrichment - ${enrName}`);
            }
            if (wpu1Name && wpu1Name !== '0') {
                userSubjects.add(`wpu1 - ${wpu1Name}`);
            }
            if (wpu2Name && wpu2Name !== '0') {
                userSubjects.add(`wpu2 - ${wpu2Name}`);
            }

            list = list.filter(item => {
                const subjectLower = item.subject.toLowerCase();
                if (
                    subjectLower.startsWith('enrichment') ||
                    subjectLower.startsWith('wpu (di)') ||
                    subjectLower.startsWith('wpu (do)') ||
                    subjectLower.startsWith('wpu1') ||
                    subjectLower.startsWith('wpu2')
                ) {
                    return userSubjects.has(item.subject);
                }
                return true;
            });
        }

        return [...pinnedList, ...list];
    });

    const limitedItems = computed(() => filteredItems.value.slice(0, visibleCount.value));

    function setVisibleCount(count: number) {
        visibleCount.value = count;
    }

    function showMore() { visibleCount.value = Math.min(visibleCount.value + 5, filteredItems.value.length); }
    function showLess() { visibleCount.value = Math.max(5, visibleCount.value - 5); }

    async function loadCheckedForMe() {
        if (!user.value) { checkedItems.value = new Set(); return; }
        try {
            const { data } = await hw.get('/api/user/checks');
            checkedItems.value = new Set(data.itemIds || []);
        } catch { checkedItems.value = new Set(); }
    }

    async function checkAndScrollToItem(targetId: string | undefined, forceOldEntries: () => void) {
        if (!targetId) {
            highlightedItemId.value = null;
            return;
        }

        const existsInRaw = items.value.some(i => i.id === targetId);

        if (!existsInRaw) {
            if (!showOldEntries.value) {
                forceOldEntries();
                return;
            }
            return;
        }

        let index = filteredItems.value.findIndex(i => i.id === targetId);

        if (index === -1 && subjectFilter.value) {
            subjectFilter.value = '';
            await nextTick();
            index = filteredItems.value.findIndex(i => i.id === targetId);
        }

        if (index === -1) return;

        highlightedItemId.value = targetId;

        if (index >= visibleCount.value) {
            visibleCount.value = index + 5;
            await nextTick();
        }

        const el = document.getElementById(`item-${targetId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function reloadList(routeParamsItemId?: string, forceOldEntries?: () => void) {
        if (tab.value === 'PRIVATE') {
            loading.value = false;
            items.value = [];
            expandedDescriptions.value = new Set();
            revealedImages.value = new Set();
            visibleCount.value = 5;
            return;
        }

        loading.value = true;
        const params: Record<string, any> = { type: tab.value };
        if (showOldEntries.value) params.filter = 'old';

        try {
            const { data } = await hw.get('/api/items', { params });
            items.value = data;
            expandedDescriptions.value = new Set();
            revealedImages.value = new Set();
        } catch (e) {
            console.error('Failed to load items:', e);
        } finally {
            loading.value = false;
            initialLoad.value = false;

            if (!routeParamsItemId) {
                visibleCount.value = Math.min(5, filteredItems.value.length || 5);
            }

            if (routeParamsItemId && forceOldEntries) {
                await checkAndScrollToItem(routeParamsItemId, forceOldEntries);
            }
        }
    }

    async function refreshItem(itemId: string, onUpdate?: (item: HwItem) => void) {
        try {
            const { data } = await hw.get(`/api/items/${itemId}`);
            const index = items.value.findIndex(i => i.id === itemId);
            if (index !== -1) {
                items.value[index] = data;
            }
            if (onUpdate) onUpdate(data);
        } catch (e) {
            console.error(`Failed to refresh item ${itemId}:`, e);
        }
    }

    return {
        items,
        loading,
        initialLoad,
        visibleCount,
        checkedItems,
        filteredItems,
        limitedItems,
        setVisibleCount,
        showMore,
        showLess,
        loadCheckedForMe,
        reloadList,
        refreshItem,
        checkAndScrollToItem
    };
}
