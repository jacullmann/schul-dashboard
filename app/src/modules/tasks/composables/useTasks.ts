import {
  ref,
  computed,
  watch,
  onMounted,
  provide,
  inject,
  type InjectionKey,
} from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload';
import { useTaskPermissions } from '@/modules/tasks/composables/useTaskPermissions';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/common/composables/useToast';
import { subjectLabel } from '@/utils/subject-formatter';
import type { HwItem, ItemType, TaskMenuAction } from '@/modules/tasks/types';
import { isUuid } from '@/utils/uuid';
import { isValidType } from '@/modules/tasks/types';
import { taskRoute } from '@/modules/tasks/utils/routes';

import type { HwContext } from './hw/types';
import { useHwUi } from './hw/useHwUi';
import { TASK_PAGE_SIZE, useHwList } from './hw/useHwList';
import { useHwForms } from './hw/useHwForms';
import { useHwImages } from './hw/useHwImages';
import { useHwActions } from './hw/useHwActions';
import { useHwDetail } from './hw/useHwDetail';

export type { HwItem };

export interface TaskFilters {
  tab: ItemType;
  showOldEntries: boolean;
  subject: string;
  hideChecked: boolean;
}

function filtersFromQuery(query: LocationQuery): TaskFilters {
  return {
    tab: isValidType(query.type) ? query.type : 'all',
    showOldEntries: query.archived === 'true',
    // Links from before tasks referenced subjects by id carry a subject name.
    subject: isUuid(query.subject) ? query.subject : '',
    hideChecked: query.hideChecked === 'true',
  };
}

function queryFromFilters(filters: TaskFilters): LocationQuery {
  const query: LocationQuery = {};
  if (filters.tab !== 'all') query.type = filters.tab;
  if (filters.showOldEntries) query.archived = 'true';
  if (filters.subject) query.subject = filters.subject;
  if (filters.hideChecked) query.hideChecked = 'true';
  return query;
}

/** `fixedFilters` take precedence over the filters in the URL. */
function createTasks(fixedFilters: Partial<TaskFilters>) {
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();
  const subjectStore = useSubjectStore();
  const groupId = useGroupPageId();
  const imageUpload = useImageUpload(groupId);
  const permissions = useTaskPermissions(groupId);
  const { user } = storeToRefs(userStore);
  const i18n = useI18n();
  const t = i18n.t.bind(i18n);
  const te = i18n.te.bind(i18n);

  const isListRoute = computed(() => route.name === 'group-tasks');
  const openedItemId = computed(() =>
    route.name === 'group-task' && typeof route.params.taskId === 'string'
      ? route.params.taskId
      : null,
  );

  const initialFilters = { ...filtersFromQuery(route.query), ...fixedFilters };
  const tab = ref<ItemType>(initialFilters.tab);
  const showOldEntries = ref(initialFilters.showOldEntries);
  const subjectFilter = ref(initialFilters.subject);
  const hideChecked = ref(initialFilters.hideChecked);
  const showPersonalized = computed(() => user.value?.personalized ?? false);

  const items = ref<HwItem[]>([]);
  const hiddenByCourses = ref(0);
  const loadingList = ref(true);
  const checksLoading = ref(true);
  const pinsLoading = ref(true);
  const initialLoad = ref(true);
  const visibleCount = ref(TASK_PAGE_SIZE);

  const checkedItems = ref(new Set<string>());
  const pinnedItems = ref(new Set<string>());
  const archivedItems = ref(new Set<string>());
  const keptItems = ref(new Set<string>());
  const dismissedItems = ref(new Set<string>());
  const pendingCheckRemovals = ref(new Set<string>());
  const useListTransitions = ref(false);

  const openMenuId = ref<string | null>(null);
  const openedItem = ref<HwItem | null>(null);
  const infoItem = ref<HwItem | null>(null);

  const loading = computed(
    () => loadingList.value || checksLoading.value || pinsLoading.value,
  );

  const ctx: HwContext = {
    user,
    tab,
    showOldEntries,
    subjectFilter,
    hideChecked,
    groupId,
    showPersonalized,
    items,
    hiddenByCourses,
    loading: loadingList,
    checksLoading,
    pinsLoading,
    initialLoad,
    visibleCount,
    checkedItems,
    pinnedItems,
    archivedItems,
    keptItems,
    dismissedItems,
    pendingCheckRemovals,
    useListTransitions,
    openMenuId,
    openedItemId,
    openedItem,
    reloadList: async () => {},
    refreshItem: async () => {},
  };

  useHwUi(ctx);
  const list = useHwList(ctx);
  const actions = useHwActions(ctx, (msg) => useToast().success(msg));

  ctx.reloadList = list.reloadList;
  ctx.refreshItem = list.refreshItem;

  const forms = useHwForms(ctx);
  const images = useHwImages(ctx, imageUpload, permissions);
  const detail = useHwDetail(ctx);

  async function archiveItem(item: HwItem) {
    useListTransitions.value = true;
    dismissedItems.value.add(item.id);
    dismissedItems.value = new Set(dismissedItems.value);
    setTimeout(() => {
      useListTransitions.value = false;
    }, 1200);
    const success = await actions.toggleVisibility(item, showOldEntries.value);
    if (!success) {
      dismissedItems.value.delete(item.id);
      dismissedItems.value = new Set(dismissedItems.value);
    }
  }

  /**
   * Moves a task into the archive or out of it by where the task is, not by
   * which of the two the list shows: an opened task may be in either.
   */
  async function toggleArchive(item: HwItem) {
    const isInArchive = actions.isInArchive(item);
    if (isInArchive === showOldEntries.value) return archiveItem(item);
    if (!(await actions.toggleVisibility(item, isInArchive))) return;
    // It joins the list, which may still hide it from an earlier dismissal.
    dismissedItems.value.delete(item.id);
    dismissedItems.value = new Set(dismissedItems.value);
    await list.reloadList();
  }

  const hasLoadedOnce = ref(false);

  watch(
    loading,
    (val) => {
      if (!val) hasLoadedOnce.value = true;
    },
    { immediate: true },
  );

  const finalInitialLoad = computed(
    () => !hasLoadedOnce.value || initialLoad.value,
  );

  const subjectOptions = computed(() => [
    { label: t('tasks.list.allsubjects'), value: '' },
    ...subjectStore.subjects.map((s) => ({
      label: subjectLabel(s.name, t, te),
      value: s.id,
    })),
  ]);

  function goTab(t_type: ItemType) {
    tab.value = t_type;
  }

  function openItem(item: HwItem) {
    return router.push(taskRoute(groupId, item.id));
  }

  async function onMenuAction(action: TaskMenuAction, item: HwItem) {
    openMenuId.value = null;
    if (action === 'archive') {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return archiveItem(item);
    }
    if (action === 'images') return images.triggerImageUpload(item);
    if (action === 'edit') return forms.editItem(item);
    if (action === 'addNote') {
      forms.startEditNote(item);
      // The note is only shown on the task's own page.
      if (openedItemId.value !== item.id) await openItem(item);
      return;
    }
    if (action === 'delete') return actions.deleteItem(item.id);
    if (action === 'report') return actions.reportItem(item);
    if (action === 'pin') return actions.togglePin(item);
    if (action === 'share') return actions.shareItem(item);
    if (action === 'info') infoItem.value = item;
  }

  function resetFilters() {
    subjectFilter.value = '';
    showOldEntries.value = false;
    hideChecked.value = false;
    if (tab.value !== 'all') goTab('all');
  }

  // The filters live in the list's URL. An opened task has a URL of its own,
  // so they keep their values behind it and the list comes back unchanged.
  watch(
    () => route.query,
    (query) => {
      if (!isListRoute.value) return;
      const filters = filtersFromQuery(query);
      tab.value = filters.tab;
      showOldEntries.value = filters.showOldEntries;
      subjectFilter.value = filters.subject;
      hideChecked.value = filters.hideChecked;
    },
  );

  watch([tab, showOldEntries, subjectFilter, hideChecked], () => {
    if (!isListRoute.value) return;
    void router.replace({
      query: queryFromFilters({
        tab: tab.value,
        showOldEntries: showOldEntries.value,
        subject: subjectFilter.value,
        hideChecked: hideChecked.value,
      }),
    });
  });

  watch(
    [tab, showOldEntries, subjectFilter, hideChecked, showPersonalized],
    () => {
      dismissedItems.value.clear();
      pendingCheckRemovals.value.clear();
      list.resetVisibleCount();
      void list.reloadList();
    },
  );

  // Feedback lives in the upload progress toast; refresh so partial uploads show up too.
  watch(imageUpload.uploading, async (val, oldVal) => {
    if (oldVal && !val && images.currentUploadItemId.value) {
      const itemId = images.currentUploadItemId.value;
      images.currentUploadItemId.value = null;
      await list.refreshItem(itemId);
    }
  });

  watch(user, async (newUser, oldUser) => {
    if (newUser && !oldUser) {
      await Promise.all([
        list.loadCheckedForMe(),
        actions.loadPinnedForMe(),
        list.loadVisibilityForMe(),
      ]);
      void list.reloadList();
    }
    if (!newUser && oldUser) {
      checkedItems.value = new Set();
      pinnedItems.value = new Set();
      archivedItems.value = new Set();
      keptItems.value = new Set();
      void list.reloadList();
    }
  });

  onMounted(async () => {
    await subjectStore.loadSubjects(groupId);
    await Promise.all([
      list.reloadList(),
      list.loadCheckedForMe(),
      actions.loadPinnedForMe(),
      list.loadVisibilityForMe(),
    ]);
  });

  return {
    user,
    loading,
    checksLoading,
    pinsLoading,
    subjectFilter,
    showPersonalized,
    hiddenByCourses,
    showOldEntries,
    hideChecked,
    visibleCount,
    limitedItems: list.limitedItems,
    filteredItems: list.filteredItems,
    showReportConfirm: actions.showReportConfirm,
    reportReason: actions.reportReason,
    tab,
    openMenuId,
    infoItem,
    openedItem,
    openedItemError: detail.openedItemError,
    retryOpenedItem: detail.retryOpenedItem,
    showMore: list.showMore,
    showLess: list.showLess,
    onMenuAction,
    ...permissions,
    openCreateForm: forms.openCreateForm,
    editingNoteForId: forms.editingNoteForId,
    noteEditContent: forms.noteEditContent,
    savingNote: forms.savingNote,
    startEditNote: forms.startEditNote,
    cancelEditNote: forms.cancelEditNote,
    saveNote: forms.saveNote,
    deleteNote: forms.deleteNote,
    goTab,
    isChecked: actions.isChecked,
    toggleCheck: actions.toggleCheck,
    isPinned: actions.isPinned,
    togglePin: actions.togglePin,
    isInArchive: actions.isInArchive,
    archiveItem,
    toggleArchive,
    deleteItem: actions.deleteItem,
    shareItem: actions.shareItem,
    dismissedItems,
    useListTransitions,
    makeThumb: images.makeThumb,
    doReport: actions.doReport,
    cancelReport: actions.cancelReport,
    initialLoad: finalInitialLoad,
    imageMenu: images.imageMenu,
    closeImageMenu: images.closeImageMenu,
    triggerImageUpload: images.triggerImageUpload,
    triggerImageDrop: images.triggerImageDrop,
    triggerImageDelete: images.triggerImageDelete,
    handleImageContextMenu: images.handleImageContextMenu,
    subjectOptions,
    resetFilters,
  };
}

export type Tasks = ReturnType<typeof createTasks>;

const TASKS_KEY: InjectionKey<Tasks> = Symbol('tasks');

/**
 * Owned by the tasks page, so the list and a task opened from it share one
 * state: checks, pins and notes changed on either show on both, and the list
 * is still loaded and filtered when the task is closed again. The dashboard
 * owns one of its own for its task cards.
 */
export function provideTasks(fixedFilters: Partial<TaskFilters> = {}): Tasks {
  const tasks = createTasks(fixedFilters);
  provide(TASKS_KEY, tasks);
  return tasks;
}

export function useTasks(): Tasks {
  const tasks = inject(TASKS_KEY);
  if (!tasks) throw new Error('useTasks() used outside the tasks page');
  return tasks;
}
