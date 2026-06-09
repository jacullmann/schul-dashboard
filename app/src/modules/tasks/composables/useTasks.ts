import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useModalStore } from '@/stores/modalStore';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/common/composables/useToast';
import { formatSubjectDisplay } from '@/utils/subject-formatter';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import { isValidType } from '@/modules/tasks/types';

import type { HwContext } from './hw/types';
import { useHwUi } from './hw/useHwUi';
import { useHwList } from './hw/useHwList';
import { useHwForms } from './hw/useHwForms';
import { useHwImages } from './hw/useHwImages';
import { useHwActions } from './hw/useHwActions';

export type { HwItem };

export function useTasks() {
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();
  const subjectStore = useSubjectStore();
  const modalStore = useModalStore();
  const imageUpload = useImageUpload();
  const { user } = storeToRefs(userStore);
  const { t, te } = useI18n();

  const tab = ref<ItemType>(
    isValidType(route.query.type as string) ? (route.query.type as ItemType) : 'all',
  );
  const showOldEntries = ref(route.query.archived === 'true');
  const subjectFilter = ref((route.query.subject as string) || '');
  const hideChecked = ref(route.query.hideChecked === 'true');
  const showPersonalized = computed(() => user.value?.personalized ?? false);
  const activeGroupId = computed(
    () => (route.params.groupId as string) || null,
  );

  const items = ref<HwItem[]>([]);
  const loadingList = ref(true);
  const checksLoading = ref(true);
  const pinsLoading = ref(true);
  const initialLoad = ref(true);
  const visibleCount = ref(5);

  const checkedItems = ref(new Set<string>());
  const pinnedItems = ref(new Set<string>());
  const archivedItems = ref(new Set<string>());
  const keptItems = ref(new Set<string>());
  const dismissedItems = ref(new Set<string>());

  const expandedDescriptions = ref(new Set<string>());
  const revealedImages = ref(new Set<string>());
  const openMenuId = ref<string | null>(null);
  const highlightedItemId = ref<string | null>(null);

  const loading = computed(
    () => loadingList.value || checksLoading.value || pinsLoading.value,
  );

  const ctx: HwContext = {
    user,
    tab,
    showOldEntries,
    subjectFilter,
    hideChecked,
    activeGroupId,
    showPersonalized,
    items,
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
    expandedDescriptions,
    revealedImages,
    openMenuId,
    highlightedItemId,
    reloadList: async () => {},
    refreshItem: async () => {},
  };

  const ui = useHwUi(ctx);
  const list = useHwList(ctx);
  const actions = useHwActions(ctx, (msg) => useToast().success(msg));

  ctx.reloadList = list.reloadList;
  ctx.refreshItem = list.refreshItem;

  const forms = useHwForms(ctx);
  const images = useHwImages(ctx, imageUpload);

  async function archiveItem(item: HwItem) {
    dismissedItems.value.add(item.id);
    dismissedItems.value = new Set(dismissedItems.value);
    const success = await actions.toggleVisibility(
      item,
      showOldEntries.value,
      new Date().toISOString(),
    );
    if (!success) {
      dismissedItems.value.delete(item.id);
      dismissedItems.value = new Set(dismissedItems.value);
    }
  }

  const subjects = computed(() => subjectStore.availableSubjectKeys);
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

  const getSubjectName = (subject: string) =>
    formatSubjectDisplay(subject, t, te);

  const getTypeLabel = (type: string) => {
    if (type === 'homework') return t('tasks.list.types.homework');
    if (type === 'dalton') return t('tasks.list.types.dalton');
    if (type === 'exam') return t('tasks.list.types.exam');
    return type;
  };

  const subjectOptions = computed(() => [
    { label: t('tasks.list.allsubjects'), value: '' },
    ...subjectStore.availableSubjectKeys.map((s) => ({
      label: getSubjectName(s),
      value: s,
    })),
  ]);

  function goTab(t_type: ItemType) {
    tab.value = t_type;
  }

  async function onMenuAction(action: string, item: HwItem) {
    openMenuId.value = null;
    if (action === 'archive') {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return archiveItem(item);
    }
    if (action === 'images') return images.triggerImageUpload(item);
    if (action === 'edit') return forms.editItem(item);
    if (action === 'addNote') return forms.startEditNote(item);
    if (action === 'delete') return actions.deleteItem(item.id);
    if (action === 'report') return actions.reportItem(item);
    if (action === 'pin') return actions.togglePin(item);
    if (action === 'share') return actions.shareItem(item);
  }

  function reload() {
    return list.reloadList(route.query.itemId as string, () => {
      showOldEntries.value = true;
    });
  }

  function resetFilters() {
    subjectFilter.value = '';
    showOldEntries.value = false;
    hideChecked.value = false;
    if (tab.value !== 'all') goTab('all');
  }

  watch([showOldEntries, tab, subjectFilter, hideChecked], () => {
    dismissedItems.value.clear();
  });

  // Sync route query -> local state
  watch(
    () => route.query,
    (q) => {
      const newTab = isValidType(q.type as string) ? (q.type as ItemType) : 'all';
      if (tab.value !== newTab) tab.value = newTab;

      const newArchived = q.archived === 'true';
      if (showOldEntries.value !== newArchived) showOldEntries.value = newArchived;

      const newSubject = (q.subject as string) || '';
      if (subjectFilter.value !== newSubject) subjectFilter.value = newSubject;

      const newHideChecked = q.hideChecked === 'true';
      if (hideChecked.value !== newHideChecked) hideChecked.value = newHideChecked;
    },
    { immediate: true }
  );

  // Sync local state -> route query
  watch(
    [tab, showOldEntries, subjectFilter, hideChecked],
    ([newTab, newArchived, newSubject, newHideChecked]) => {
      const query = { ...route.query };

      if (newTab === 'all') delete query.type;
      else query.type = newTab;

      if (!newArchived) delete query.archived;
      else query.archived = 'true';

      if (!newSubject) delete query.subject;
      else query.subject = newSubject;

      if (!newHideChecked) delete query.hideChecked;
      else query.hideChecked = 'true';

      router.replace({ query }).catch(() => {});
    }
  );

  watch(
    () => [
      route.query.type,
      route.query.archived,
      route.query.subject,
      route.query.hideChecked,
      showPersonalized.value
    ],
    () => {
      reload();
    },
  );

  watch(
    () => route.query.itemId,
    async (newId) => {
      if (newId)
        await list.checkAndScrollToItem(newId as string, () => {
          showOldEntries.value = true;
        });
    },
  );

  watch(showOldEntries, () => {
    const targetId = route.query.itemId as string;
    const exists = items.value.some((i) => i.id === targetId);

    if (targetId && !exists && showOldEntries.value) return;

    if (highlightedItemId.value && route.query.itemId) {
      const query = { ...route.query };
      delete query.itemId;
      router.replace({ query }).catch(() => {});
    }
    reload();
  });

  watch(subjectFilter, () => {
    if (highlightedItemId.value && route.query.itemId) {
      const query = { ...route.query };
      delete query.itemId;
      router.replace({ query }).catch(() => {});
    }
  });

  watch([subjectFilter, tab, items, hideChecked], () => {
    if (!route.query.itemId) {
      list.setVisibleCount(Math.min(5, list.filteredItems.value.length || 5));
    }
  });

  watch(imageUpload.uploading, async (val, oldVal) => {
    if (oldVal && !val && images.currentUploadItemId.value) {
      if (imageUpload.uploadSuccess.value) {
        await list.refreshItem(images.currentUploadItemId.value);
        useToast().success(t('tasks.list.item_form.success_upload'));
      } else if (imageUpload.uploadError.value) {
        useToast().error(imageUpload.uploadError.value);
      }
      images.currentUploadItemId.value = null;
    }
  });

  watch(
    user,
    async (newUser, oldUser) => {
      if (newUser && !oldUser) {
        await Promise.all([
          list.loadCheckedForMe(),
          actions.loadPinnedForMe(),
          list.loadVisibilityForMe(),
        ]);
        reload();
      }
      if (!newUser && oldUser) {
        checkedItems.value = new Set();
        pinnedItems.value = new Set();
        archivedItems.value = new Set();
        keptItems.value = new Set();
        reload();
      }
    },
    { deep: true },
  );

  onMounted(async () => {
    await subjectStore.loadSubjects();
    await Promise.all([
      reload(),
      list.loadCheckedForMe(),
      actions.loadPinnedForMe(),
      list.loadVisibilityForMe(),
    ]);
  });

  return {
    user,
    subjects,
    loading,
    subjectFilter,
    showPersonalized,
    showOldEntries,
    hideChecked,
    visibleCount,
    limitedItems: list.limitedItems,
    filteredItems: list.filteredItems,
    showReportConfirm: actions.showReportConfirm,
    reportReason: actions.reportReason,
    tab,
    openMenuId,
    isExpanded: ui.isExpanded,
    toggleDescription: ui.toggleDescription,
    showMore: list.showMore,
    showLess: list.showLess,
    toggleMenu: ui.toggleMenu,
    onMenuAction,
    onItemFormError: forms.onItemFormError,
    canEdit: actions.canEdit,
    canDelete: actions.canDelete,
    canDeleteImage: actions.canDeleteImage,
    canEditNote: forms.canEditNote,
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
    isArchived: actions.isArchived,
    isKept: actions.isKept,
    toggleVisibility: actions.toggleVisibility,
    archiveItem,
    pinnedItems,
    archivedItems,
    keptItems,
    dismissedItems,
    makeThumb: images.makeThumb,
    isRevealed: ui.isRevealed,
    revealImages: ui.revealImages,
    onSetupSuccess: () => modalStore.openSetup(),
    doReport: actions.doReport,
    cancelReport: actions.cancelReport,
    openCreateFormByType: forms.openCreateFormByType,
    initialLoad: finalInitialLoad,
    imageMenu: images.imageMenu,
    openImageMenu: images.openImageMenu,
    closeImageMenu: images.closeImageMenu,
    triggerImageUpload: images.triggerImageUpload,
    triggerImageDrop: images.triggerImageDrop,
    triggerImageDelete: images.triggerImageDelete,
    showImageViewer: images.showImageViewer,
    viewerImages: images.viewerImages,
    viewerStartIndex: images.viewerStartIndex,
    openImageViewer: images.openImageViewer,
    closeImageViewer: images.closeImageViewer,
    shareItem: actions.shareItem,
    highlightedItemId,
    handleImageContextMenu: images.handleImageContextMenu,
    subjectOptions,
    getSubjectName,
    getTypeLabel,
    resetFilters,
    makeUrl: images.makeUrl,
  };
}
