import { onMounted, watch, computed, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
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

  // Core states
  const tab = ref<ItemType>(
    isValidType(route.params.type) ? route.params.type : 'all',
  );
  const showOldEntries = ref(false);
  const subjectFilter = ref('');
  const showPersonalized = computed(() => user.value?.personalized ?? false);

  const activeGroupId = computed(
    () => (route.params.groupId as string) || null,
  );

  // UI states
  const {
    openMenuId,
    highlightedItemId,
    expandedDescriptions,
    revealedImages,
    isExpanded,
    toggleDescription,
    toggleMenu,
    onDocumentClick,
    isRevealed,
    revealImages,
  } = useHwUi();

  // Pinned
  const pinnedItems = ref(new Set<string>());
  const dismissedItems = ref(new Set<string>());

  // List
  const {
    items,
    loading: listLoading,
    checksLoading,
    initialLoad: hwInitialLoad,
    visibleCount,
    checkedItems,
    archivedItems,
    keptItems,
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
  } = useHwList(
    user,
    tab,
    showOldEntries,
    subjectFilter,
    pinnedItems,
    showPersonalized,
    expandedDescriptions,
    revealedImages,
    highlightedItemId,
  );

  // Actions
  const {
    showReportConfirm,
    reportReason,
    pinsLoading,
    loadPinnedForMe,
    isChecked,
    isPinned,
    isArchived,
    isKept,
    toggleCheck,
    togglePin,
    toggleVisibility,
    canEdit,
    canDelete,
    canDeleteImage,
    deleteItem,
    reportItem,
    doReport,
    cancelReport,
    shareItem,
  } = useHwActions(
    user,
    checkedItems,
    pinnedItems,
    archivedItems,
    keptItems,
    activeGroupId,
    (msg) => useToast().success(msg),
  );

  async function archiveItem(item: HwItem) {
    dismissedItems.value.add(item.id);
    const cutoffIso = new Date().toISOString();
    const success = await toggleVisibility(
      item,
      showOldEntries.value,
      cutoffIso,
    );
    if (!success) {
      dismissedItems.value.delete(item.id);
    }
  }

  // Forms
  const {
    editingNoteForId,
    noteEditContent,
    savingNote,
    onItemFormError,
    editItem,
    openCreateFormByType,
    canEditNote,
    startEditNote,
    cancelEditNote,
    saveNote,
  } = useHwForms(user, items, () => reloadList());

  // Images
  const {
    showImageViewer,
    viewerImages,
    viewerStartIndex,
    imageMenu,
    currentUploadItemId,
    openImageViewer,
    closeImageViewer,
    handleImageContextMenu,
    openImageMenu,
    closeImageMenu,
    triggerImageUpload,
    triggerImageDrop,
    triggerImageDelete,
    makeThumb,
  } = useHwImages(user, imageUpload, refreshItem);

  const subjects = computed(() => subjectStore.availableSubjectKeys);

  const loading = computed(
    () => listLoading.value || checksLoading.value || pinsLoading.value,
  );
  const hasLoadedOnce = ref(false);

  watch(
    loading,
    (val) => {
      if (!val) hasLoadedOnce.value = true;
    },
    { immediate: true },
  );

  const initialLoad = computed(
    () => !hasLoadedOnce.value || hwInitialLoad.value,
  );

  const getSubjectName = (subject: string) => {
    return formatSubjectDisplay(subject, t, te);
  };

  const getTypeLabel = (type: string) => {
    if (type === 'homework') return t('school.tasks.types.homework');
    if (type === 'dalton') return t('school.tasks.types.dalton');
    if (type === 'exam') return t('school.tasks.types.exam');
    return type;
  };

  const subjectOptions = computed(() => {
    const defaultOption = { label: t('school.tasks.allsubjects'), value: '' };

    const dynamicOptions = subjectStore.availableSubjectKeys.map((s) => ({
      label: getSubjectName(s),
      value: s,
    }));

    return [defaultOption, ...dynamicOptions];
  });

  function goTab(t_type: ItemType) {
    router.push({
      name: 'group-items',
      params: { ...route.params, type: t_type },
    });
  }

  async function onMenuAction(
    action:
      | 'images'
      | 'edit'
      | 'delete'
      | 'report'
      | 'pin'
      | 'archive'
      | 'share',
    item: HwItem,
  ) {
    openMenuId.value = null;

    if (action === 'archive') {
      // Delay to allow the menu closing animation (150ms) to finish
      // before the item is removed from the list (dismissedItems).
      await new Promise((resolve) => setTimeout(resolve, 200));
      return archiveItem(item);
    }

    if (action === 'images') return triggerImageUpload(item);
    if (action === 'edit') return editItem(item);
    if (action === 'delete') return deleteItem(item.id, items);
    if (action === 'report') return reportItem(item);
    if (action === 'pin') return togglePin(item);
    if (action === 'share') return shareItem(item);
  }

  function reload() {
    return reloadList(route.params.itemId as string, () => {
      showOldEntries.value = true;
    });
  }

  function resetFilters() {
    subjectFilter.value = '';
    showOldEntries.value = false;
    if (tab.value !== 'all') {
      goTab('all');
    }
  }

  // --- Watchers ---

  watch([showOldEntries, tab, subjectFilter], () => {
    dismissedItems.value.clear();
  });

  watch(
    () => route.params.type,
    (v) => {
      tab.value = isValidType(v) ? v : 'all';
      reload();
    },
  );

  watch(
    () => route.params.itemId,
    async (newId) => {
      if (newId)
        await checkAndScrollToItem(newId as string, () => {
          showOldEntries.value = true;
        });
    },
  );

  watch(showOldEntries, () => {
    const targetId = route.params.itemId as string;
    const exists = items.value.some((i) => i.id === targetId);

    if (targetId && !exists && showOldEntries.value) return;

    if (highlightedItemId.value && route.params.itemId) {
      router.replace({
        name: 'group-items',
        params: { ...route.params, itemId: '' },
      });
    }
    reload();
  });

  watch(subjectFilter, () => {
    if (highlightedItemId.value && route.params.itemId) {
      router.replace({
        name: 'group-items',
        params: { ...route.params, itemId: '' },
      });
    }
  });

  watch([subjectFilter, tab, items], () => {
    if (!route.params.itemId) {
      setVisibleCount(Math.min(5, filteredItems.value.length || 5));
    }
  });

  watch(imageUpload.uploading, async (val, oldVal) => {
    if (oldVal && !val && currentUploadItemId.value) {
      if (imageUpload.uploadSuccess.value) {
        await refreshItem(currentUploadItemId.value);
      }

      if (imageUpload.uploadError.value) {
        useToast().error(imageUpload.uploadError.value);
      } else if (imageUpload.uploadSuccess.value) {
        useToast().success(t('school.tasks.itemForm.successUpload'));
      }

      currentUploadItemId.value = null;
    }
  });

  watch(
    user,
    async (newUser, oldUser) => {
      if (newUser && !oldUser) {
        await Promise.all([
          loadCheckedForMe(),
          loadPinnedForMe(),
          loadVisibilityForMe(),
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

  // --- Lifecycle ---

  useEventListener(document, 'click', onDocumentClick);

  onMounted(async () => {
    await subjectStore.loadSubjects();
    await Promise.all([
      reload(),
      loadCheckedForMe(),
      loadPinnedForMe(),
      loadVisibilityForMe(),
    ]);
  });

  return {
    user,
    subjects,
    loading,
    subjectFilter,
    showPersonalized,
    showOldEntries,
    visibleCount,
    limitedItems,
    filteredItems,
    showReportConfirm,
    reportReason,
    tab,
    openMenuId,
    isExpanded,
    toggleDescription,
    showMore,
    showLess,
    toggleMenu,
    onMenuAction,
    onItemFormError,
    canEdit,
    canDelete,
    canDeleteImage,
    canEditNote,
    editingNoteForId,
    noteEditContent,
    savingNote,
    startEditNote,
    cancelEditNote,
    saveNote,
    goTab,
    isChecked,
    toggleCheck,
    isPinned,
    togglePin,
    isArchived,
    isKept,
    toggleVisibility,
    archiveItem,
    pinnedItems,
    archivedItems,
    keptItems,
    dismissedItems,
    makeThumb,
    isRevealed,
    revealImages,
    onSetupSuccess: () => modalStore.openSetup(),
    doReport,
    cancelReport,
    openCreateFormByType,
    initialLoad,
    imageMenu,
    openImageMenu,
    closeImageMenu,
    triggerImageUpload,
    triggerImageDrop,
    triggerImageDelete,
    showImageViewer,
    viewerImages,
    viewerStartIndex,
    openImageViewer,
    closeImageViewer,
    shareItem,
    highlightedItemId,
    handleImageContextMenu,
    subjectOptions,
    getSubjectName,
    getTypeLabel,
    resetFilters,
  };
}
