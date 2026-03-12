import { onMounted, onBeforeUnmount, watch, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload';
import { useI18n } from 'vue-i18n';
import { formatSubjectDisplay } from '@/utils/subject-formatter';
import type { HwItem, ItemType } from '@/modules/tasks/types';
import { isValidType } from '@/modules/tasks/types';

import { useHwMessage } from './hw/useHwMessage';
import { useHwUi } from './hw/useHwUi';
import { useHwList } from './hw/useHwList';
import { useHwForms } from './hw/useHwForms';
import { useHwImages } from './hw/useHwImages';
import { useHwActions } from './hw/useHwActions';

export type { HwItem };

export function useAufgaben() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const subjectStore = useSubjectStore();
    const imageUpload = useImageUpload();
    const { user } = storeToRefs(userStore);
    const { t, te } = useI18n();

    const MAX_TITLE_LENGTH = 50;
    const MAX_SUBJECT_LENGTH = 100;

    // Core states
    const tab = ref<ItemType>(isValidType(route.params.type) ? (route.params.type as ItemType) : 'ALLE');
    const showOldEntries = ref(false);
    const subjectFilter = ref('');
    const showPersonalized = computed(() => user.value?.personalized ?? false);
    const showSetupModal = ref(false);

    // Message
    const { message, isError, flashMessage, clearMessageTimer } = useHwMessage();

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
        revealImages
    } = useHwUi();

    // Pinned
    const pinnedItems = ref(new Set<string>());

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
        checkAndScrollToItem
    } = useHwList(
        user,
        tab,
        showOldEntries,
        subjectFilter,
        pinnedItems,
        showPersonalized,
        expandedDescriptions,
        revealedImages,
        highlightedItemId
    );

    // Actions
    const {
        showDeleteConfirm,
        deletingEntry,
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
        cancelDelete,
        confirmDelete,
        reportItem,
        doReport,
        cancelReport,
        shareItem
    } = useHwActions(
        user,
        checkedItems,
        pinnedItems,
        archivedItems,
        keptItems,
        flashMessage,
        (msg) => handleSuccess(msg)
    );

    // Forms
    const {
        itemFormType,
        showItemForm,
        itemToEdit,
        itemFormKey,
        editingNoteForId,
        noteEditContent,
        savingNote,
        onItemFormError,
        handleSuccess,
        editItem,
        openCreateFormByType,
        canEditNote,
        startEditNote,
        cancelEditNote,
        saveNote
    } = useHwForms(
        user,
        items,
        flashMessage,
        () => reloadList()
    );

    // Images
    const {
        showImageViewer,
        viewerImages,
        viewerStartIndex,
        imageMenu,
        showImageDeleteConfirm,
        deletingImage,
        currentUploadItemId,
        openImageViewer,
        closeImageViewer,
        handleImageContextMenu,
        openImageMenu,
        closeImageMenu,
        triggerImageUpload,
        triggerImageDrop,
        triggerImageDelete,
        confirmImageDelete,
        cancelImageDelete,
        makeThumb
    } = useHwImages(
        user,
        imageUpload,
        refreshItem,
        flashMessage
    );

    const subjects = computed(() => subjectStore.availableSubjectKeys);

    const loading = computed(() => listLoading.value || checksLoading.value || pinsLoading.value);
    const hasLoadedOnce = ref(false);

    watch(loading, (val) => {
        if (!val) hasLoadedOnce.value = true;
    }, { immediate: true });

    const initialLoad = computed(() => !hasLoadedOnce.value || hwInitialLoad.value);

    const getSubjectName = (subject: string) => {
        return formatSubjectDisplay(subject, t, te);
    };

    const getTypeLabel = (type: string) => {
        if (type === 'HAUSAUFGABE') return t('school.tasks.types.homework');
        if (type === 'DALTON') return t('school.tasks.types.dalton');
        if (type === 'PRUEFUNG') return t('school.tasks.types.exam');
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
            params: { ...route.params, type: t_type }
        });
    }

    function onMenuAction(action: 'images' | 'edit' | 'delete' | 'report', item: HwItem) {
        openMenuId.value = null;
        if (action === 'images') return triggerImageUpload(item);
        if (action === 'edit') return editItem(item);
        if (action === 'delete') return deleteItem(item.id);
        if (action === 'report') return reportItem(item);
    }

    function onSetupSuccess(updatedUser: Record<string, unknown>) {
        if (user.value) {
            user.value = { ...user.value, ...updatedUser } as typeof user.value;
        }
        showSetupModal.value = false;
    }

    function reload() {
        return reloadList(route.params.itemId as string, () => {
            showOldEntries.value = true;
        });
    }

    // --- Watchers ---

    watch(() => route.params.type, (v) => {
        tab.value = isValidType(v) ? (v as ItemType) : 'ALLE';
        reload();
    });

    watch(() => route.params.itemId, async (newId) => {
        if (newId) await checkAndScrollToItem(newId as string, () => { showOldEntries.value = true; });
    });

    watch(showOldEntries, () => {
        const targetId = route.params.itemId as string;
        const exists = items.value.some(i => i.id === targetId);

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

    watch(() => imageUpload.uploading, async (val, oldVal) => {
        if (oldVal && !val && !imageUpload.uploadError && currentUploadItemId.value) {
            await refreshItem(currentUploadItemId.value);
            currentUploadItemId.value = null;
            flashMessage('Bild erfolgreich hochgeladen.', false, 3000);
        }
    });

    watch(user, async (newUser, oldUser) => {
        if (newUser && !oldUser) {
            await Promise.all([loadCheckedForMe(), loadPinnedForMe(), loadVisibilityForMe()]);
            reload();
        }
        if (!newUser && oldUser) {
            checkedItems.value = new Set();
            pinnedItems.value = new Set();
            archivedItems.value = new Set();
            keptItems.value = new Set();
            reload();
        }
    }, { deep: true });

    // --- Lifecycle ---

    onMounted(async () => {
        document.addEventListener('click', onDocumentClick);
        await subjectStore.loadSubjects();
        await Promise.all([reload(), loadCheckedForMe(), loadPinnedForMe(), loadVisibilityForMe()]);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', onDocumentClick);
        clearMessageTimer();
    });

    return {
        MAX_TITLE_LENGTH,
        MAX_SUBJECT_LENGTH,
        showItemForm,
        itemToEdit,
        user,
        subjects,
        loading,
        subjectFilter,
        showPersonalized,
        showOldEntries,
        message,
        isError,
        itemFormKey,
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
        handleSuccess,
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
        pinnedItems,
        archivedItems,
        keptItems,
        makeThumb,
        isRevealed,
        revealImages,
        onSetupSuccess,
        doReport,
        cancelReport,
        openCreateFormByType,
        itemFormType,
        showDeleteConfirm,
        confirmDelete,
        cancelDelete,
        initialLoad,
        imageMenu,
        openImageMenu,
        closeImageMenu,
        triggerImageUpload,
        triggerImageDrop,
        triggerImageDelete,
        showImageDeleteConfirm,
        confirmImageDelete,
        cancelImageDelete,
        showImageViewer,
        viewerImages,
        viewerStartIndex,
        openImageViewer,
        closeImageViewer,
        showSetupModal,
        shareItem,
        highlightedItemId,
        deletingImage,
        deletingEntry,
        handleImageContextMenu,
        subjectOptions,
        getSubjectName,
        getTypeLabel,
    };
}