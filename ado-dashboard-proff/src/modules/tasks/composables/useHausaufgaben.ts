import kommt kei{ ref, onMounted, onBeforeUnmount, watch, computed, reactive, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore.ts';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload.ts';
import { useGlobalAuthModal } from '@/core/composables/useGlobalAuthModal.ts';
import { getSubjectKey, ENR_COURSES, WPU1_COURSES, WPU2_COURSES, AVAILABLE_SUBJECTS } from '@/types/subjects.ts';
import hw from '@/api/hwApi';
import type { HwItem, ItemType } from '@/modules/tasks/types.ts';
import { isValidType } from '@/modules/tasks/types.ts';
import { useI18n } from 'vue-i18n';
import { formatSubjectDisplay } from '@/utils/subject-formatter.ts';

export type { HwItem };



export function useHausaufgaben() {
    const route = useRoute();
    const router = useRouter();
    const { openAuthModal: handleShowAuthModal } = useGlobalAuthModal();
    const userStore = useUserStore();
    const imageUpload = useImageUpload();
    const { user } = storeToRefs(userStore);
    const { t, te } = useI18n();

    const MAX_TITLE_LENGTH = 50;
    const MAX_SUBJECT_LENGTH = 30;

    // --- State ---
    const itemFormType = ref<'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG'>('HAUSAUFGABE');
    const showItemForm = ref(false);
    const showAnnouncementForm = ref(false);
    const itemToEdit = ref<HwItem | null>(null);
    const subjects = ref<string[]>([]);
    const items = ref<HwItem[]>([]);
    const loading = ref(true);
    const initialLoad = ref(true);
    const subjectFilter = ref('');
    const showPersonalized = computed(() => user.value?.personalized ?? false);
    const showOldEntries = ref(false);
    const showSetupModal = ref(false);
    const highlightedItemId = ref<string | null>(null);

    const showImageViewer = ref(false);
    const viewerImages = ref<HwItem['images']>([]);
    const viewerStartIndex = ref(0);

    const showDeleteConfirm = ref(false);
    const itemToDelete = ref<string | null>(null);

    // TODO: type these properly when Todo types are available
    const showTodoForm = ref(false);
    const todoToEdit = ref<any>(null);
    const todoAppRef = ref<any>(null);

    const message = ref('');
    const isError = ref(false);
    const itemFormKey = ref(0);

    const checkedItems = ref(new Set<string>());
    const pinnedItems = ref(new Set<string>());
    const expandedDescriptions = ref<Set<string>>(new Set());
    const visibleCount = ref(5);

    const showReportConfirm = ref(false);
    const reportReason = ref('');
    const reportTarget = ref<HwItem | null>(null);

    const imageMenu = reactive({
        visible: false,
        x: 0,
        y: 0,
        item: null as HwItem | null,
        image: null as any | null,
    });

    const showImageDeleteConfirm = ref(false);
    const deletingEntry = ref(false);
    const deletingImage = ref(false);

    const editingNoteForId = ref<string | null>(null);
    const noteEditContent = ref('');
    const savingNote = ref(false);

    const currentUploadItemId = ref<string | null>(null);

    const tab = ref<ItemType>(isValidType(route.params.type) ? (route.params.type as ItemType) : 'HAUSAUFGABE');
    const openMenuId = ref<string | null>(null);
    const revealedImages = ref(new Set<string>());

    // --- Flash message helper ---
    // Prevents stale timeouts from clearing a newer message prematurely
    let messageTimerId: ReturnType<typeof setTimeout> | null = null;

    function flashMessage(text: string, error = false, durationMs = 5000) {
        if (messageTimerId) clearTimeout(messageTimerId);
        message.value = text;
        isError.value = error;
        messageTimerId = setTimeout(() => {
            message.value = '';
            isError.value = false;
            messageTimerId = null;
        }, durationMs);
    }

    // --- Computed ---

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
            if (enrName && enrName !== '0') {
                userSubjects.add(`enrichment - ${enrName}`);
                // add backward compat support
                const legacyEnrName = ENR_COURSES.find(k => k.id === enrName)?.name;
                if (legacyEnrName) userSubjects.add(`Enrichment - ${legacyEnrName}`);
            }
            if (wpu1Name && wpu1Name !== '0') {
                userSubjects.add(`wpu1 - ${wpu1Name}`);
                const legacyWpu1Name = WPU1_COURSES.find(k => k.id === wpu1Name)?.name;
                if (legacyWpu1Name) userSubjects.add(`WPU (Di) - ${legacyWpu1Name}`);
            }
            if (wpu2Name && wpu2Name !== '0') {
                userSubjects.add(`wpu2 - ${wpu2Name}`);
                const legacyWpu2Name = WPU2_COURSES.find(k => k.id === wpu2Name)?.name;
                if (legacyWpu2Name) userSubjects.add(`WPU (Do) - ${legacyWpu2Name}`);
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

    const getSubjectName = (subject: string) => {
        return formatSubjectDisplay(subject, t, te);
    };

    const subjectOptions = computed(() => {
        const defaultOption = { label: t('school.tasks.allsubjects'), value: '' };

        const allSubjects = Array.from(new Set([...AVAILABLE_SUBJECTS, ...subjects.value]));
        const dynamicOptions = allSubjects.map((s) => ({
            label: getSubjectName(s),
            value: s,
        }));

        return [defaultOption, ...dynamicOptions];
    });

    // --- Actions ---

    async function checkAndScrollToItem() {
        const targetId = route.params.itemId as string;

        if (!targetId) {
            highlightedItemId.value = null;
            return;
        }

        const existsInRaw = items.value.some(i => i.id === targetId);

        if (!existsInRaw) {
            if (!showOldEntries.value) {
                showOldEntries.value = true;
                // The showOldEntries watcher will trigger reload(), which re-invokes this function
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

    function openImageViewer(item: HwItem, index: number) {
        viewerImages.value = item.images;
        viewerStartIndex.value = index;
        showImageViewer.value = true;
    }

    function closeImageViewer() {
        showImageViewer.value = false;
        // Delay clearing so the fade-out animation still has data
        setTimeout(() => {
            viewerImages.value = [];
            viewerStartIndex.value = 0;
        }, 300);
    }

    function isExpanded(id: string) { return expandedDescriptions.value.has(id); }

    function toggleDescription(id: string) {
        if (expandedDescriptions.value.has(id)) expandedDescriptions.value.delete(id);
        else expandedDescriptions.value.add(id);
    }

    function showMore() { visibleCount.value = Math.min(visibleCount.value + 5, filteredItems.value.length); }
    function showLess() { visibleCount.value = Math.max(5, visibleCount.value - 5); }
    function toggleMenu(id: string) { openMenuId.value = openMenuId.value === id ? null : id; }

    function onMenuAction(action: 'images' | 'edit' | 'delete' | 'report', item: HwItem) {
        openMenuId.value = null;
        if (action === 'images') return triggerImageUpload(item);
        if (action === 'edit') return editItem(item);
        if (action === 'delete') return deleteItem(item.id);
        if (action === 'report') return reportItem(item);
    }

    function reportItem(item: HwItem) {
        reportTarget.value = item;
        reportReason.value = '';
        showReportConfirm.value = true;
    }

    function openCreateFormByType(type: ItemType) {
        if (type === 'PRIVATE') {
            todoToEdit.value = null;
            showTodoForm.value = true;
        } else {
            itemToEdit.value = null;
            itemFormType.value = type;
            showItemForm.value = true;
        }
    }

    function openEditTodo(todo: any) {
        todoToEdit.value = todo;
        showTodoForm.value = true;
    }

    function handleTodoSuccess(msg: string, data?: any) {
        flashMessage(msg);
        showTodoForm.value = false;
        if (todoAppRef.value && data) {
            if (todoToEdit.value) {
                todoAppRef.value.updateTodo(data);
            } else {
                todoAppRef.value.addTodo(data);
            }
        }
        todoToEdit.value = null;
    }

    function onDocumentClick() {
        if (openMenuId.value) openMenuId.value = null;
    }

    function onSetupSuccess(updatedUser: any) {
        user.value = { ...user.value, ...updatedUser };
        showSetupModal.value = false;
    }

    // --- Data loading ---

    async function loadCheckedForMe() {
        if (!user.value) { checkedItems.value = new Set(); return; }
        try {
            const { data } = await hw.get('/api/user/checks');
            checkedItems.value = new Set(data.itemIds || []);
        } catch { checkedItems.value = new Set(); }
    }

    async function loadPinnedForMe() {
        if (!user.value) { pinnedItems.value = new Set(); return; }
        try {
            const { data } = await hw.get('/api/user/pins');
            pinnedItems.value = new Set(data.itemIds || []);
        } catch { pinnedItems.value = new Set(); }
    }

    async function loadSubjects() {
        try {
            const { data } = await hw.get('/api/subjects');
            subjects.value = data;
        } catch { /* subjects stay empty */ }
    }

    async function reload() {
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

            if (!route.params.itemId) {
                visibleCount.value = Math.min(5, filteredItems.value.length || 5);
            }

            await checkAndScrollToItem();
        }
    }

    async function refreshItem(itemId: string) {
        try {
            const { data } = await hw.get(`/api/items/${itemId}`);
            const index = items.value.findIndex(i => i.id === itemId);
            if (index !== -1) {
                items.value[index] = data;
            }
            if (imageMenu.item?.id === itemId) {
                imageMenu.item = data;
            }
        } catch (e) {
            console.error(`Failed to refresh item ${itemId}:`, e);
        }
    }

    // --- Auth & Account ---

    async function logout() {
        try {
            await hw.post('/api/auth/logout');
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            userStore.clearUser();
        }
    }

    // --- Item CRUD ---

    function handleSuccess(msg: string) {
        flashMessage(msg);
        itemFormKey.value += 1;
        showItemForm.value = false;
        showAnnouncementForm.value = false;
        reload();
    }

    function onItemFormError(msg: string) {
        flashMessage(msg || 'Bitte Eingaben prüfen.', true);
    }

    function editItem(item: HwItem) {
        itemToEdit.value = item;
        itemFormType.value = item.type;
        showItemForm.value = true;
    }

    function deleteItem(id: string) {
        itemToDelete.value = id;
        showDeleteConfirm.value = true;
    }

    function cancelDelete() {
        showDeleteConfirm.value = false;
        itemToDelete.value = null;
    }

    async function confirmDelete() {
        if (!itemToDelete.value || deletingEntry.value) return;

        deletingEntry.value = true;
        const id = itemToDelete.value;

        try {
            await hw.delete(`/api/items/${id}`);
            showDeleteConfirm.value = false;
            itemToDelete.value = null;
            handleSuccess('Eintrag gelöscht.');
        } catch (e: any) {
            flashMessage(e.response?.data?.error || 'Fehler beim Löschen.', true);
        } finally {
            deletingEntry.value = false;
        }
    }

    // --- Report ---

    async function doReport(category: 'illegal' | 'falschinfo') {
        if (!reportTarget.value) return;
        const item = reportTarget.value;
        const reason = reportReason.value;
        cancelReport();
        flashMessage('Melde...', false, 10000);

        try {
            await hw.post('/api/items/reports', {
                itemId: item.id,
                itemTitle: item.title,
                category,
                reason,
            });
            flashMessage('Eintrag gemeldet.', false, 7000);
        } catch (e: any) {
            flashMessage('Fehler beim Melden: ' + (e.response?.data?.error || ''), true, 7000);
        }
    }

    function cancelReport() {
        showReportConfirm.value = false;
        reportTarget.value = null;
        reportReason.value = '';
    }

    // --- Image context menu ---

    const makeThumb = imageUpload.makeThumb;

    function handleImageContextMenu(event: MouseEvent, item: any, img: any) {
        // Check if the browser supports vibration (mostly mobile devices)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50); // Short 50ms vibration
        }
        openImageMenu(event, item, img);
    }

    function openImageMenu(event: MouseEvent, item: HwItem, img: any) {
        if (!user.value) return;
        imageMenu.item = item;
        imageMenu.image = img;
        imageMenu.x = event.clientX;
        imageMenu.y = event.clientY;
        imageMenu.visible = true;
        imageUpload.init(item.images);
    }

    function closeImageMenu() {
        imageMenu.visible = false;
        imageMenu.item = null;
        imageMenu.image = null;
    }

    function triggerImageUpload(item?: HwItem) {
        const targetItem = item || imageMenu.item;
        if (!targetItem) return;

        imageUpload.init(targetItem.images);
        currentUploadItemId.value = targetItem.id;
        imageUpload.uploadImage(true, targetItem.id);
        closeImageMenu();
    }

    function triggerImageDelete() {
        showImageDeleteConfirm.value = true;
        imageMenu.visible = false;
    }

    async function confirmImageDelete() {
        if (!imageMenu.image || !imageMenu.item || deletingImage.value) return;

        deletingImage.value = true;
        try {
            await imageUpload.removeImg(imageMenu.image, imageMenu.item.id);
            await refreshItem(imageMenu.item.id);
            flashMessage('Bild gelöscht.', false, 3000);
            showImageDeleteConfirm.value = false;
            imageMenu.image = null;
            imageMenu.item = null;
        } catch {
            flashMessage('Fehler beim Löschen des Bildes.', true, 4000);
        } finally {
            deletingImage.value = false;
        }
    }

    function cancelImageDelete() {
        showImageDeleteConfirm.value = false;
        imageMenu.image = null;
        imageMenu.item = null;
    }

    // --- Check / Pin / Permissions ---

    function isRevealed(itemId: string) { return revealedImages.value.has(itemId); }
    function revealImages(itemId: string) { revealedImages.value.add(itemId); }
    function isChecked(itemId: string) { return checkedItems.value.has(itemId); }
    function isPinned(itemId: string) { return pinnedItems.value.has(itemId); }

    async function toggleCheck(item: HwItem) {
        if (!user.value) return;
        const id = item.id;
        try {
            if (isChecked(id)) {
                await hw.delete(`/api/user/items/${id}/check`);
                checkedItems.value.delete(id);
            } else {
                await hw.post(`/api/user/items/${id}/check`);
                checkedItems.value.add(id);
            }
        } catch {
            flashMessage('Fehler beim Setzen des Status.', true, 4000);
        }
    }

    async function togglePin(item: HwItem) {
        if (!user.value) return;
        const id = item.id;
        try {
            // Snapshot so we can roll back on failure without partial state
            const newPins = new Set(pinnedItems.value);
            if (newPins.has(id)) {
                await hw.delete(`/api/user/items/${id}/pin`);
                newPins.delete(id);
            } else {
                await hw.post(`/api/user/items/${id}/pin`);
                newPins.add(id);
            }
            pinnedItems.value = newPins;
        } catch {
            flashMessage('Fehler beim Setzen des Status.', true, 4000);
        }
    }

    function canEdit(createdBy: string) {
        return user.value?.id === createdBy;
    }

    function canDelete(createdBy: string) {
        if (!user.value) return false;
        return user.value.isAdmin || user.value.id === createdBy;
    }

    function canDeleteImage(itemCreatedBy: string, imageCreatedBy: string) {
        if (!user.value) return false;
        return user.value.isAdmin || user.value.id === imageCreatedBy || user.value.id === itemCreatedBy;
    }

    function canEditNote() {
        return user.value?.isAdmin === true;
    }

    // --- Editor notes ---

    function startEditNote(item: HwItem) {
        editingNoteForId.value = item.id;
        noteEditContent.value = item.editorNote || '';
    }

    function cancelEditNote() {
        editingNoteForId.value = null;
        noteEditContent.value = '';
    }

    async function saveNote(itemId: string) {
        if (savingNote.value) return;
        savingNote.value = true;

        try {
            await hw.patch(`/api/items/${itemId}/note`, {
                editorNote: noteEditContent.value,
            });

            const item = items.value.find(i => i.id === itemId);
            if (item) item.editorNote = noteEditContent.value;

            flashMessage('Anmerkung gespeichert.');
            editingNoteForId.value = null;
            noteEditContent.value = '';
        } catch (e: any) {
            flashMessage(e.response?.data?.error || 'Fehler beim Speichern der Anmerkung.', true);
        } finally {
            savingNote.value = false;
        }
    }

    // --- Share ---

    async function shareItem(item: HwItem) {
        const shareUrl = `${window.location.origin}/items/${item.type}/${item.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `Schau dir diesen Eintrag an: ${item.title}`,
                    url: shareUrl,
                });
            } catch (err) {
                // User cancelled or share failed — no action needed
                console.error('Teilen abgebrochen oder fehlgeschlagen:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                flashMessage('Link in die Zwischenablage kopiert!', false, 3000);
            } catch {
                flashMessage('Teilen fehlgeschlagen.', true, 3000);
            }
        }
    }

    function goTab(t: ItemType) { router.push({ name: 'items', params: { type: t } }); }

    // --- Watchers ---

    watch(() => route.params.type, (v) => {
        tab.value = isValidType(v) ? v : 'HAUSAUFGABE';
        reload();
    });

    watch(() => route.params.itemId, async (newId) => {
        if (newId) await checkAndScrollToItem();
    });

    watch(showOldEntries, () => {
        const targetId = route.params.itemId as string;
        const exists = items.value.some(i => i.id === targetId);

        // Skip if we just turned on old entries to find a deep-linked item
        if (targetId && !exists && showOldEntries.value) return;

        if (highlightedItemId.value && route.params.itemId) {
            router.replace({
                name: 'items',
                params: { ...route.params, itemId: '' },
            });
        }
        reload();
    });

    watch(subjectFilter, () => {
        if (highlightedItemId.value && route.params.itemId) {
            router.replace({
                name: 'items',
                params: { ...route.params, itemId: '' },
            });
        }
    });

    watch([subjectFilter, tab, items], () => {
        if (!route.params.itemId) {
            visibleCount.value = Math.min(5, filteredItems.value.length || 5);
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
            await Promise.all([loadCheckedForMe(), loadPinnedForMe()]);
            reload();
        }
        if (!newUser && oldUser) {
            checkedItems.value = new Set();
            pinnedItems.value = new Set();
            reload();
        }
    }, { deep: true });

    // --- Lifecycle ---

    onMounted(async () => {
        document.addEventListener('click', onDocumentClick);
        await Promise.all([loadSubjects(), reload(), loadCheckedForMe(), loadPinnedForMe()]);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', onDocumentClick);
        if (messageTimerId) clearTimeout(messageTimerId);
    });

    return {
        MAX_TITLE_LENGTH,
        MAX_SUBJECT_LENGTH,
        showItemForm,
        showAnnouncementForm,
        itemToEdit,
        user,
        subjects,
        items,
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
        logout,
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
        pinnedItems,
        makeThumb,
        isRevealed,
        revealImages,
        onSetupSuccess,
        doReport,
        cancelReport,
        showTodoForm,
        todoToEdit,
        openCreateFormByType,
        handleTodoSuccess,
        itemFormType,
        openEditTodo,
        todoAppRef,
        showDeleteConfirm,
        confirmDelete,
        cancelDelete,
        initialLoad,
        imageMenu,
        openImageMenu,
        closeImageMenu,
        triggerImageUpload,
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
    };
}