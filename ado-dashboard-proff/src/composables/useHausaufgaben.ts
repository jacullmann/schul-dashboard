import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGlobalAuthModal } from './useGlobalAuthModal';
import hw, { setHwToken } from '../hwApi';
import { marked } from 'marked';

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
}

export function useHausaufgaben() {
    const route = useRoute();
    const router = useRouter();
    const { openAuthModal } = useGlobalAuthModal();

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
    const showImageFormFor = ref<any>(null);
    const itemToEdit = ref<HwItem | null>(null);
    const user = ref<any>(null);
    const subjects = ref<string[]>([]);
    const announcements = ref<any[]>([]);
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
    const colorFor = (color: string) => {
        const map: Record<string, string> = {
            'ok': 'var(--primary)',
            'warn': 'var(--warn)',
            'danger': 'var(--danger)',
            'expired': '#4b5563',
            'info': '#3b82f6',
        };
        return map[color] || 'var(--muted)';
    };

    const colorStyles = (timeColor: string) => {
        if (timeColor === 'expired') return { background: '#414141', color: 'white' };
        if (timeColor === 'danger') return { background: 'var(--danger)', color: 'white' };
        if (timeColor === 'warn') return { background: 'var(--warn)', color: 'black' };
        if (timeColor === 'info') return { background: '#3b82f6', color: 'white' };
        return { background: 'var(--gg)', color: 'white' };
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
        if (action === 'images') return showImageForm(item);
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

    function handleTodoSuccess(msg: string) {
        message.value = msg;
        isError.value = false;
        showTodoForm.value = false;

        // Liste in TodoApp neu laden
        if (todoAppRef.value && todoAppRef.value.loadTodos) {
            todoAppRef.value.loadTodos();
        }

        setTimeout(() => message.value = '', 5000);
    }

    function onDocumentClick(e: MouseEvent) {
        if (!openMenuId.value) return;
        openMenuId.value = null;
    }

    function onSetupSuccess(updatedUser: any) {
        user.value = { ...user.value, ...updatedUser };
        showSetupModal.value = false;
        handleSuccess('Kurseinstellungen erfolgreich gespeichert.');
    }

    function openSetupModal() {
        if (user.value) showSetupModal.value = true;
    }

    // General Data Loading
    async function loadMe() {
        try {
            const { data } = await hw.get('/api/auth/me');
            user.value = data;
            await loadCheckedForMe();

        } catch {
            user.value = null;
            checkedItems.value = new Set();
        }
    }
    function onPersonalizationChanged(value: boolean) {
        if (user.value) {
            user.value.personalized = value;
            reload();
        }
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

    async function loadAnnouncements() {
        try {
            const { data } = await hw.get('/api/announcements');
            announcements.value = data;
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

    // Auth & Account
    function onAccountDeleted() {
        setHwToken(null);
        user.value = null;
        checkedItems.value = new Set();
        message.value = 'Account erfolgreich gelöscht.';
        isError.value = false;
        reload();
        setTimeout(() => { message.value = ''; }, 5000);
    }

    function onAccountDeleteError(msg: string) {
        message.value = msg;
        isError.value = true;
        setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
    }

    function onLoggedIn(token: string) {
        setHwToken(token);
        loadMe();
        reload();
    }

    function logout() {
        setHwToken(null);
        user.value = null;
        checkedItems.value = new Set();
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

    async function deleteAnnouncement(id: string) {
        if (confirm('Ankündigung löschen?')) {
            try {
                await hw.delete(`/api/announcements/${id}`);
                handleSuccess('Ankündigung gelöscht.');
            } catch (e: any) {
                message.value = e.response?.data?.error || 'Fehler.';
                isError.value = true;
            }
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
    function makeThumb(url: string) {
        try {
            const u = new URL(url);
            if (u.pathname.includes('upload')) {
                u.pathname = u.pathname.replace('upload', 'upload/f_webp,q_auto:best,w_120,h_120,c_fill');
            }
            return u.toString();
        } catch { return url; }
    }

    function handlePersonalizationChange(event: CustomEvent) {
        if (user.value && event.detail?.personalized !== undefined) {
            user.value.personalized = event.detail.personalized;
            reload();
        }
    }

    function handleUserLoggedIn() {
        loadMe();
        reload();
    }

    function handleUserLoggedOut() {
        user.value = null;
        checkedItems.value = new Set();
        reload();
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

    function canManage(createdBy: string) {
        if (!user.value) return false;
        return user.value.isAdmin || user.value.id === createdBy;
    }

    function goTab(t: ItemType) { router.push({ name: 'ItemsByType', params: { type: t } }); }

    // --- Watchers ---
    watch(() => route.params.type, async (v) => {
        tab.value = isValidType(v) ? v : 'HAUSAUFGABE';
        await loadMe();
        reload();
    });
    watch(showOldEntries, reload);
    watch([subjectFilter, tab, items], () => {
        visibleCount.value = Math.min(5, filteredItems.value.length || 5);
    });

    onMounted(() => {
        document.addEventListener('click', onDocumentClick);
        loadMe();
        loadSubjects();
        loadAnnouncements();
        reload();
        window.addEventListener('user-logged-in', handleUserLoggedIn);
        window.addEventListener('user-logged-out', handleUserLoggedOut);
        window.addEventListener('show-auth-modal', handleShowAuthModal);
        window.addEventListener('personalization-changed', handlePersonalizationChange as EventListener);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', onDocumentClick);
        window.removeEventListener('user-logged-in', handleUserLoggedIn);
        window.removeEventListener('user-logged-out', handleUserLoggedOut);
        window.removeEventListener('show-auth-modal', handleShowAuthModal);
        window.removeEventListener('personalization-changed', handlePersonalizationChange as EventListener);
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
        announcements,
        items,
        loading,
        subjectFilter,
        showPersonalized,
        onPersonalizationChanged,
        showOldEntries,
        showSetupModal,
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
        colorFor,
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
        canManage,
        deleteAnnouncement,
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
        initialLoad
    };
}