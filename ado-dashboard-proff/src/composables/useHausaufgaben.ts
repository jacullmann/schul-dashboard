import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../stores/userStore';
import { useImageUploadStore } from '../stores/imageStore';
import { useGlobalAuthModal } from './useGlobalAuthModal';
import hw from '../hwApi';

// Interface Definition exportieren
export interface HwItem {
    id: string;
    type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
    title: string;
    subject: string;
    description: string;
    images: Array<{ url: string; thumbUrl?: string; publicId: string; createdBy: string }>;
    dueDate: string;
    createdBy: string;
    createdByEmail?: string;
    timeColor: string;
    editorNote: string;
}

export function useHausaufgaben() {
    const route = useRoute();
    const router = useRouter();
    const { openAuthModal } = useGlobalAuthModal();
    const userStore = useUserStore();
    const imageStore = useImageUploadStore(); // Init Image Store
    const { user } = storeToRefs(userStore);

    // --- Konstanten ---
    const enrKurse = [
        { id: '1', name: 'Herr Müller' },
        { id: '2', name: 'Herr Weber' },
        { id: '3', name: 'Frau Glier' },
        { id: '4', name: 'Frau Ellsiepen' },
    ];
    const wpuDiKurse = [
        { id: '1', name: 'Englisch' },
        { id: '2', name: 'Deutsch' },
        { id: '3', name: 'Biologie' },
        { id: '4', name: 'Geschichte' },
        { id: '5', name: 'Informatik' },
        { id: '6', name: 'Latein' },
    ];
    const wpuDoKurse = [
        { id: '1', name: 'Englisch' },
        { id: '2', name: 'Biologie' },
        { id: '3', name: 'Mathe' },
        { id: '4', name: 'Geschichte' },
        { id: '5', name: 'Musik' },
    ];

    const MAX_TITLE_LENGTH = 50;
    const MAX_SUBJECT_LENGTH = 30;

    const itemFormType = ref<'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG'>('HAUSAUFGABE');

    // --- State ---
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


    const showDeleteConfirm = ref(false);
    let itemToDelete: string | null = null;

    // Todo State
    const showTodoForm = ref(false);
    const todoToEdit = ref<any>(null);
    // Ref für die TodoApp Komponente, um reload zu triggern
    const todoAppRef = ref<any>(null);

    // UI Messages
    const message = ref('');
    const isError = ref(false);
    const itemFormKey = ref(0);

    // Checked items & Expansion & Pagination
    const checkedItems = ref(new Set<string>());
    const expandedDescriptions = ref<Set<string>>(new Set());
    const visibleCount = ref(5);

    // Confirm Dialog State
    const showReportConfirm = ref(false);
    const reportReason = ref('');
    let reportTarget: HwItem | null = null;

    // Image Context Menu State
    const imageMenu = reactive({
        visible: false,
        x: 0,
        y: 0,
        item: null as HwItem | null,
        image: null as any | null
    });

    const showImageDeleteConfirm = ref(false);

    // State für Anmerkungsbearbeitung
    const editingNoteForId = ref<string | null>(null);
    const noteEditContent = ref('');
    const savingNote = ref(false);

    // Tab Handling
    type ItemType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE';
    function isValidType(t: any): t is ItemType {
        return t === 'HAUSAUFGABE' || t === 'DALTON' || t === 'PRUEFUNG' || t === 'PRIVATE';
    }
    const tab = ref<ItemType>(isValidType(route.params.type) ? (route.params.type as ItemType) : 'HAUSAUFGABE');

    // Menu & Images
    const openMenuId = ref<string | null>(null);
    const revealedImages = ref(new Set<string>());

    // --- Computed ---
    const colorStyles = (timeColor: string) => {
        if (timeColor === 'expired') return { background: 'var(--gg)', color: 'var(--text)' };
        if (timeColor === 'danger') return { background: 'var(--danger)', color: 'var(--text)' };
        if (timeColor === 'warn') return { background: 'var(--warn)', color: 'var(--card)' };
        if (timeColor === 'info') return { background: 'var(--primary)', color: 'var(--text)' };
        return { background: 'var(--gg)', color: 'var(--text)' };
    };

    const filteredItems = computed(() => {
        let list = items.value;
        const filter = subjectFilter.value;

        if (filter) {
            const parentCategories = ['enrichment', 'wpu (di)', 'wpu (do)'];
            const filterLower = filter.toLowerCase();

            if (parentCategories.includes(filterLower)) {
                list = list.filter(i => i.subject.toLowerCase().startsWith(filterLower));
            } else {
                list = list.filter(i => i.subject.toLowerCase() === filterLower);
            }
        }

        if (showPersonalized.value && user.value && user.value.doneSetup) {
            const enrName = enrKurse.find(k => k.id == user.value.enrKurs)?.name;
            const wpu1Name = wpuDiKurse.find(k => k.id == user.value.wpuKurs1)?.name;
            const wpu2Name = wpuDoKurse.find(k => k.id == user.value.wpuKurs2)?.name;

            const userSubjects = new Set<string>();
            if (enrName) userSubjects.add(`Enrichment - ${enrName}`);
            if (wpu1Name) userSubjects.add(`WPU (Di) - ${wpu1Name}`);
            if (wpu2Name) userSubjects.add(`WPU (Do) - ${wpu2Name}`);

            list = list.filter(item => {
                const subjectLower = item.subject.toLowerCase();
                if (subjectLower.startsWith('enrichment')) return userSubjects.has(item.subject);
                if (subjectLower.startsWith('wpu (di)')) return userSubjects.has(item.subject);
                if (subjectLower.startsWith('wpu (do)')) return userSubjects.has(item.subject);
                return true;
            });
        }

        return list;
    });

    const limitedItems = computed(() => filteredItems.value.slice(0, visibleCount.value));

    // --- Actions ---

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
        if (action === 'images') {
            // Fallback logic if user clicks the button instead of right clicking image
            // For now, we don't have a "target image" so we can't open context menu easily.
            // You might want to remove the "Images" button from the main menu
            // OR trigger an upload directly.
            // Let's trigger upload directly for the item:
            triggerImageUpload(item);
            return;
        }
        if (action === 'edit') return editItem(item);
        if (action === 'delete') return deleteItem(item.id);
        if (action === 'report') return reportItem(item);
    }

    function reportItem(item: HwItem) {
        reportTarget = item;
        reportReason.value = '';
        showReportConfirm.value = true;
    }

    function openCreateFormByType(type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE') {
        if (type === 'PRIVATE') {
            todoToEdit.value = null; // Reset für neuen Eintrag
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
        message.value = msg;
        isError.value = false;
        showTodoForm.value = false;
        if (todoAppRef.value && data) {
            if (todoToEdit.value) {
                todoAppRef.value.updateTodo(data);
            } else {
                todoAppRef.value.addTodo(data);
            }
        }

        todoToEdit.value = null;
        setTimeout(() => message.value = '', 5000);
    }


    function onDocumentClick(e: MouseEvent) {
        if (!openMenuId.value) return;
        openMenuId.value = null;
    }

    function onSetupSuccess(updatedUser: any) {
        user.value = { ...user.value, ...updatedUser };
        showSetupModal.value = false;
    }

    function openSetupModal() {
        if (user.value) showSetupModal.value = true;
    }
    function onPersonalizationChanged(value: boolean) {
        userStore.updateUser({ personalized: value });
    }

    async function loadCheckedForMe() {
        if (!user.value) { checkedItems.value = new Set(); return; }
        try {
            const { data } = await hw.get('/api/checks/me');
            checkedItems.value = new Set(data.itemIds || []);
        } catch (e) { checkedItems.value = new Set(); }
    }

    async function loadSubjects() {
        try {
            const { data } = await hw.get('/api/subjects');
            subjects.value = data;
        } catch (e) {}
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
            visibleCount.value = Math.min(5, filteredItems.value.length || 5);
        }
    }

// Find the refreshItem function and update it:
    async function refreshItem(itemId: string) {
        try {
            // Fetch the specific item from the API (Now works because we added the route!)
            const { data } = await hw.get(`/api/items/${itemId}`);

            // 1. Update list
            const index = items.value.findIndex(i => i.id === itemId);
            if (index !== -1) {
                items.value[index] = data;
            }

            // 2. Update modal reference if open
            if (showImageFormFor.value && showImageFormFor.value.id === itemId) {
                showImageFormFor.value = data;
            }
        } catch (e) {
            console.error(`Failed to refresh item ${itemId}:`, e);
        }
    }

    // Auth & Account
    function onAccountDeleted() {
        userStore.clearUser();
    }

    function onAccountDeleteError(msg: string) {
        console.error('Account delete error:', msg);
    }

    async function onLoggedIn() {
        await userStore.fetchUser();
        await loadCheckedForMe();
        reload();
    }

    async function logout() {
        try {
            await hw.post('/api/auth/logout');
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            userStore.clearUser();
        }
    }

    const handleShowAuthModal = () => {
        openAuthModal();
    };

    // Item Management
    function handleSuccess(msg: string) {
        message.value = msg;
        isError.value = false;
        itemFormKey.value += 1;
        setTimeout(() => message.value = '', 5000);
        showItemForm.value = false;
        showAnnouncementForm.value = false;
        showImageFormFor.value = null;
        reload();
    }

    function onItemFormError(msg: string) {
        message.value = msg || 'Bitte Eingaben prüfen.';
        isError.value = true;
        setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
    }

    function editItem(item: HwItem) {
        itemToEdit.value = item;
        itemFormType.value = item.type;
        showItemForm.value = true;
    }

    function deleteItem(id: string) {
        itemToDelete = id;
        showDeleteConfirm.value = true;
    }
    function cancelDelete() {
        showDeleteConfirm.value = false;
        itemToDelete = null;
    }
    async function confirmDelete() {
        if (!itemToDelete) return;

        const id = itemToDelete;
        showDeleteConfirm.value = false;
        itemToDelete = null;

        loading.value = true;
        try {
            await hw.delete(`/api/items/${id}`);
            handleSuccess('Eintrag gelöscht.');
        } catch (e: any) {
            message.value = e.response?.data?.error || 'Fehler beim Löschen.';
            isError.value = true;
        } finally {
            loading.value = false;
        }
    }

    // Report
    async function doReport(category: 'illegal' | 'falschinfo') {
        if (!reportTarget) return;
        const item = reportTarget;
        const reason = reportReason.value;
        cancelReport();
        message.value = 'Melde...';
        isError.value = false;

        try {
            await hw.post('/api/reports', {
                itemId: item.id,
                itemTitle: item.title,
                category,
                reason: reason
            });
            message.value = 'Eintrag gemeldet.';
            isError.value = false;
        } catch (e: any) {
            message.value = 'Fehler beim Melden: ' + (e.response?.data?.error || '');
            isError.value = true;
        } finally {
            setTimeout(() => {
                message.value = '';
                isError.value = false
            }, 7000);
        }
    }

    function cancelReport() {
        showReportConfirm.value = false;
        reportTarget = null;
        reportReason.value = '';
    }

    // Image Handling
    function showImageForm(item: HwItem) { showImageFormFor.value = item; }

    // Use store helper instead of local implementation
    const makeThumb = imageStore.makeThumb;

    // Called on right click or long press
    function openImageMenu(event: MouseEvent, item: HwItem, img: any) {
        if(!user.value) return; // Only logged in users
        imageMenu.item = item;
        imageMenu.image = img;
        imageMenu.x = event.clientX;
        imageMenu.y = event.clientY;
        imageMenu.visible = true;

        // Initialize store so we have the array locally if needed (though we use item.images mostly)
        imageStore.init(item.images);
    }

    function closeImageMenu() {
        imageMenu.visible = false;
        imageMenu.item = null;
        imageMenu.image = null;
    }

    // Triggered from menu "Add Image"
    function triggerImageUpload(item?: HwItem) {
        const targetItem = item || imageMenu.item;
        if(targetItem) {
            // Init store with current images to check limits
            imageStore.init(targetItem.images);
            // Trigger upload in store (true = editMode, item.id = immediate upload)
            imageStore.uploadImage(true, targetItem.id);
            closeImageMenu();
        }
    }

    // Triggered from menu "Delete Image"
    function triggerImageDelete() {
        // Just show confirmation, store state is already set in imageMenu
        showImageDeleteConfirm.value = true;
        // Keep menu open or close it? Close it.
        imageMenu.visible = false;
    }

    async function confirmImageDelete() {
        if (imageMenu.image && imageMenu.item) {
            await imageStore.removeImg(imageMenu.image, imageMenu.item.id);
            // Refresh item to show changes
            await refreshItem(imageMenu.item.id);
            message.value = 'Bild gelöscht.';
            setTimeout(() => message.value = '', 3000);
        }
        showImageDeleteConfirm.value = false;
        imageMenu.image = null;
        imageMenu.item = null;
    }

    function cancelImageDelete() {
        showImageDeleteConfirm.value = false;
        imageMenu.image = null;
        imageMenu.item = null;
    }

    function isRevealed(itemId: string) { return revealedImages.value.has(itemId); }
    function revealImages(itemId: string) { revealedImages.value.add(itemId); }
    function isChecked(itemId: string) { return checkedItems.value.has(itemId); }

    async function toggleCheck(item: HwItem) {
        if (!user.value) return;
        const id = item.id;
        try {
            if (isChecked(id)) {
                await hw.delete(`/api/items/${id}/check`);
                checkedItems.value.delete(id);
            } else {
                await hw.post(`/api/items/${id}/check`);
                checkedItems.value.add(id);
            }
        } catch (e: any) {
            message.value = 'Fehler beim Setzen des Status.';
            isError.value = true;
            setTimeout(() => { message.value = ''; isError.value = false; }, 4000);
        }
    }

    // Bearbeiten: Nur der Ersteller (Admins haben hier KEINE Sonderrechte)
    function canEdit(createdBy: string) {
        if (!user.value) return false;
        return user.value.id === createdBy;
    }

// Löschen: Ersteller ODER Admin
    function canDelete(createdBy: string) {
        if (!user.value) return false;
        return user.value.isAdmin || user.value.id === createdBy;
    }

// Bild löschen: Admin ODER Bild-Ersteller ODER Item-Ersteller
    function canDeleteImage(itemCreatedBy: string, imageCreatedBy: string) {
        if (!user.value) return false;
        if (user.value.isAdmin) return true;
        if (user.value.id === imageCreatedBy) return true;
        if (user.value.id === itemCreatedBy) return true;
        return false;
    }

// Admin-Anmerkung bearbeiten: Nur Admins
    function canEditNote() {
        return user.value?.isAdmin === true;
    }

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
                editorNote: noteEditContent.value
            });

            // Lokales Update
            const item = items.value.find(i => i.id === itemId);
            if (item) {
                item.editorNote = noteEditContent.value;
            }

            message.value = 'Anmerkung gespeichert.';
            isError.value = false;
            editingNoteForId.value = null;
            noteEditContent.value = '';
        } catch (e: any) {
            message.value = e.response?.data?.error || 'Fehler beim Speichern der Anmerkung.';
            isError.value = true;
        } finally {
            savingNote.value = false;
            setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
        }
    }

    function goTab(t: ItemType) { router.push({ name: 'ItemsByType', params: { type: t } }); }

    // --- Watchers ---
    watch(() => route.params.type, async (v) => {
        tab.value = isValidType(v) ? v : 'HAUSAUFGABE';
        reload();
    });
    watch(showOldEntries, reload);
    watch([subjectFilter, tab, items], () => {
        visibleCount.value = Math.min(5, filteredItems.value.length || 5);
    });

    // Watch upload store to refresh item when uploading finishes
    watch(() => imageStore.uploading, async (val, oldVal) => {
        if(oldVal && !val && !imageStore.uploadError) {
            // Upload finished successfully
            if(imageMenu.item) {
                await refreshItem(imageMenu.item.id);
                message.value = 'Bild erfolgreich hochgeladen.';
                setTimeout(() => message.value = '', 3000);
            }
        }
    });

    onMounted(() => {
        document.addEventListener('click', onDocumentClick);
        loadSubjects();
        reload();
        loadCheckedForMe();
    });

    watch(user, async (newUser, oldUser) => {
        if (newUser && !oldUser) {
            await loadCheckedForMe();
            reload();
        }
        if (!newUser && oldUser) {
            checkedItems.value = new Set();
            reload();
        }
    }, { deep: true });

    onBeforeUnmount(() => {
        document.removeEventListener('click', onDocumentClick);
    });

    return {
        MAX_TITLE_LENGTH,
        MAX_SUBJECT_LENGTH,
        showItemForm,
        showAnnouncementForm,
        showImageFormFor,
        itemToEdit,
        user,
        subjects,
        items,
        loading,
        subjectFilter,
        showPersonalized,
        onPersonalizationChanged,
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
        colorStyles,
        toggleMenu,
        onMenuAction,
        onAccountDeleted,
        onAccountDeleteError,
        openSetupModal,
        logout,
        onLoggedIn,
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
        makeThumb,
        isRevealed,
        revealImages,
        onSetupSuccess,
        doReport,
        cancelReport,
        onDocumentClick,
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
        refreshItem,
        imageMenu,
        openImageMenu,
        closeImageMenu,
        triggerImageUpload,
        triggerImageDelete,
        showImageDeleteConfirm,
        confirmImageDelete,
        cancelImageDelete
    };
}