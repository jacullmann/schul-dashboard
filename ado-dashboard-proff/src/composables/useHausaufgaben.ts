// useHausaufgaben.ts
// Composable that contains the full logic originally in the script block.
// Exported as named function `useHausaufgaben` which returns all state + methods
// used by the template so replacing the original single-file component is trivial.

import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import hw, { setHwToken } from '../hwApi';
import { marked } from 'marked';

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

    const entriessorgen = ref([]);

    const showAuth = ref(false);
    const showItemForm = ref(false);
    const showAnnouncementForm = ref(false);
    const showImageFormFor = ref<any>(null);

    const itemToEdit = ref<HwItem | null>(null);

    const user = ref<any>(null);
    const subjects = ref<string[]>([]);
    const announcements = ref<any[]>([]);
    const items = ref<HwItem[]>([]);
    const loading = ref(true);
    const subjectFilter = ref('');

    const showPersonalized = ref(false);

    const allUsers = ref<any[]>([]);
    const loadingUsers = ref(false);
    const showActivityFor = ref<string | null>(null);
    const userActivities = ref<Record<string, any[]>>({});
    const loadingActivities = ref<Record<string, boolean>>({});
    const deletingUsers = ref<Record<string, boolean>>({});

    const togglingBan = ref<Record<string, boolean>>({});

    const showOldEntries = ref(false);

    const showReportConfirm = ref(false);

    const showSetupModal = ref(false);

    const reports = ref<any[]>([]);

    const securityReport = ref<string | null>(null);
    const isGeneratingReport = ref(false);
    const reportError = ref<string | null>(null);

    const reportHtml = computed(() => {
        if (securityReport.value) {
            return marked.parse(securityReport.value);
        }
        return '';
    });

    const message = ref('');
    const isError = ref(false);

    const checkedItems = ref(new Set<string>());

    const itemFormKey = ref(0);

    const expandedDescriptions = ref<Set<string>>(new Set());
    function isExpanded(id: string) {
        return expandedDescriptions.value.has(id);
    }
    function toggleDescription(id: string) {
        if (expandedDescriptions.value.has(id)) {
            expandedDescriptions.value.delete(id);
        } else {
            expandedDescriptions.value.add(id);
        }
    }

    const visibleCount = ref(5);
    function showMore() {
        visibleCount.value = Math.min(visibleCount.value + 5, filteredItems.value.length);
    }
    function showLess() {
        visibleCount.value = Math.max(5, visibleCount.value - 5);
    }


    type ItemType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
    function isValidType(t: any): t is ItemType {
        return t === 'HAUSAUFGABE' || t === 'DALTON' || t === 'PRUEFUNG';
    }

    const tab = ref<ItemType>(isValidType(route.params.type) ? (route.params.type as ItemType) : 'HAUSAUFGABE');

    watch(() => route.params.type, (v) => {
        if (isValidType(v)) {
            tab.value = v;
        } else {
            tab.value = 'HAUSAUFGABE';
        }
        reload();
    });

    watch(() => user.value?.isAdmin, (isAdmin) => {
        if (isAdmin) {
            loadReports();
        } else {
            reports.value = [];
        }
    });

    watch(showOldEntries, () => {
        reload();
    });

    watch([subjectFilter, () => tab.value, items], () => {
        visibleCount.value = Math.min(5, filteredItems.value.length || 5);
    });

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
        if (timeColor === 'expired') {
            return { background: '#414141', color: 'white' };
        }
        if (timeColor === 'danger') {
            return { background: 'var(--danger)', color: 'white' };
        }
        if (timeColor === 'warn') {
            return { background: 'var(--warn)', color: 'black' };
        }
        if (timeColor === 'info') {
            return { background: '#3b82f6', color: 'white' };
        }
        return { background: 'white', color: 'black' };
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
                if (subjectLower.startsWith('enrichment')) {
                    return userSubjects.has(item.subject);
                }
                if (subjectLower.startsWith('wpu (di)')) {
                    return userSubjects.has(item.subject);
                }
                if (subjectLower.startsWith('wpu (do)')) {
                    return userSubjects.has(item.subject);
                }
                return true;
            });
        }

        return list;
    });

    const limitedItems = computed(() => filteredItems.value.slice(0, visibleCount.value));

    const openMenuId = ref<string | null>(null);
    function toggleMenu(id: string) {
        openMenuId.value = openMenuId.value === id ? null : id;
    }

    function onMenuAction(action: 'images' | 'edit' | 'delete' | 'report', item: HwItem) {
        openMenuId.value = null;
        if (action === 'images') return showImageForm(item);
        if (action === 'edit') return editItem(item);
        if (action === 'delete') return deleteItem(item.id);
        if (action === 'report') return reportItem(item);
    }

    let reportTarget: HwItem | null = null;
    const reportReason = ref('');

    function reportItem(item: HwItem) {
        reportTarget = item;
        reportReason.value = '';
        showReportConfirm.value = true;
    }

    function onDocumentClick() {
        if (!openMenuId.value) return;
        openMenuId.value = null;
    }

    function onSetupSuccess(updatedUser: any) {
        user.value = {
            ...user.value,
            ...updatedUser
        };
        showSetupModal.value = false;
        handleSuccess('Kurseinstellungen erfolgreich gespeichert.');
    }

    function openSetupModal() {
        if (user.value) {
            showSetupModal.value = true;
        }
    }

    async function loadAllUsers() {
        if (!user.value?.isAdmin) return;

        loadingUsers.value = true;
        try {
            const { data } = await hw.get('/api/admin/all-users');
            allUsers.value = data;
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Laden der Benutzer';
            onItemFormError(errMsg);
        } finally {
            loadingUsers.value = false;
        }
    }

    async function toggleUserActivity(userId: string) {
        if (showActivityFor.value === userId) {
            showActivityFor.value = null;
            return;
        }

        loadingActivities.value[userId] = true;
        try {
            const { data } = await hw.get(`/api/admin/users/${userId}/activity`);
            userActivities.value[userId] = data;
            showActivityFor.value = userId;
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Laden der Aktivitäten';
            onItemFormError(errMsg);
        } finally {
            loadingActivities.value[userId] = false;
        }
    }

    async function deleteUser(userId: string) {
        if (!confirm('Möchtest du diesen Benutzer wirklich löschen? Alle seine Einträge werden ebenfalls gelöscht.')) {
            return;
        }

        deletingUsers.value[userId] = true;
        try {
            await hw.delete(`/api/admin/users/${userId}`);
            handleSuccess('Benutzer erfolgreich gelöscht');
            allUsers.value = allUsers.value.filter(u => u.id !== userId);
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Löschen des Benutzers';
            onItemFormError(errMsg);
        } finally {
            deletingUsers.value[userId] = false;
        }
    }

    async function toggleBan(u: any) {
        if (!u || u.isAdmin) return;

        togglingBan.value[u.id] = true;
        try {
            if (u.isBanned) {
                await hw.delete(`/api/admin/users/${u.id}/ban`);
                u.isBanned = false;
                handleSuccess('Benutzer erfolgreich entsperrt.');
            } else {
                await hw.post(`/api/admin/users/${u.id}/ban`);
                u.isBanned = true;
                handleSuccess('Benutzer erfolgreich gesperrt.');
            }
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Ändern des Sperr-Status des Accounts.';
            onItemFormError(errMsg);
        } finally {
            togglingBan.value[u.id] = false;
        }
    }

    async function loadReports() {
        if (!user.value?.isAdmin) return;
        try {
            const { data } = await hw.get('/api/admin/reports');
            reports.value = data;
        } catch (e) {
            console.error('loadReports error', e);
        }
    }

    onMounted(() => {
        document.addEventListener('click', onDocumentClick);
        loadMe();
        loadSubjects();
        loadAnnouncements();
        reload();

        if (user.value?.isAdmin) {
            loadReports();
        }

        loadSorgen();
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', onDocumentClick);
        userActivities.value = {};
        loadingActivities.value = {};
        deletingUsers.value = {};
    });

    function canManage(createdBy: string) {
        if (!user.value) return false;
        return user.value.isAdmin || user.value.id === createdBy;
    }

    function cancelReport() {
        showReportConfirm.value = false;
        reportTarget = null;
        reportReason.value = '';
    }

    async function loadMe() {
        try {
            const { data } = await hw.get('/api/auth/me');
            user.value = data;
            await loadCheckedForMe();
            if (user.value && !user.value.doneSetup) {
                showSetupModal.value = true;
            }
        } catch {
            user.value = null;
            checkedItems.value = new Set();
        }
    }

    async function loadCheckedForMe() {
        if (!user.value) {
            checkedItems.value = new Set();
            return;
        }
        try {
            const { data } = await hw.get('/api/checks/me');
            checkedItems.value = new Set(data.itemIds || []);
        } catch (e) {
            console.error('loadCheckedForMe error', e);
            checkedItems.value = new Set();
        }
    }

    async function loadSubjects() {
        try {
            const { data } = await hw.get('/api/subjects');
            subjects.value = data;
        } catch (e) {
            console.error('loadSubjects error', e);
        }
    }
    async function loadAnnouncements() {
        try {
            const { data } = await hw.get('/api/announcements');
            announcements.value = data;
        } catch (e) {
            console.error('loadAnnouncements error', e);
        }
    }

    async function reload() {
        loading.value = true;
        const params: Record<string, any> = { type: tab.value };
        if (showOldEntries.value) {
            params.filter = 'old';
        }

        try {
            const { data } = await hw.get('/api/items', { params });
            items.value = data;
            expandedDescriptions.value = new Set();
            revealedImages.value = new Set();
        } catch (e) {
            console.error('Failed to load items:', e);
        } finally {
            loading.value = false;
            visibleCount.value = Math.min(5, filteredItems.value.length || 5);
        }
    }

    async function deleteReport(id: string) {
        if (!confirm('Möchtest du diese Meldung wirklich löschen?')) {
            return;
        }

        try {
            await hw.delete(`/api/admin/reports/${id}`);
            await loadReports();
            handleSuccess('Meldung erfolgreich gelöscht.');
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Löschen.';
            message.value = 'Fehler: ' + errMsg;
            isError.value = true;
            console.error('deleteReport error', e);
            setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
        }
    }

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

    async function generateSecurityReport() {
        if (isGeneratingReport.value) return;
        isGeneratingReport.value = true;
        securityReport.value = null;
        reportError.value = null;

        try {
            const { data } = await hw.post('/api/admin/security-report');
            securityReport.value = data.report;
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Unbekannter Fehler beim Erstellen des Berichts.';
            reportError.value = errMsg;
            onItemFormError(errMsg);
        } finally {
            isGeneratingReport.value = false;
        }
    }

    function copyReportToClipboard() {
        if (!securityReport.value) return;
        navigator.clipboard.writeText(securityReport.value)
            .then(() => {
                handleSuccess('Bericht (Markdown) in die Zwischenablage kopiert.');
            })
            .catch(err => {
                onItemFormError('Fehler beim Kopieren.');
            });
    }

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

    function onLoggedIn(token: string) {
        setHwToken(token);
        showAuth.value = false;
        loadMe();
        reload();
    }

    function logout() {
        setHwToken(null);
        user.value = null;
        checkedItems.value = new Set();
    }

    function editItem(item: HwItem) {
        itemToEdit.value = item;
        showItemForm.value = true;
    }

    function openCreateForm() {
        itemToEdit.value = null;
        showItemForm.value = true;
    }

    async function deleteItem(id: string) {
        if (confirm('Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen Bilder gelöscht.')) {
            loading.value = true;
            try {
                await hw.delete(`/api/items/${id}`);
                handleSuccess('Eintrag erfolgreich gelöscht.');
            } catch (e: any) {
                message.value = e.response?.data?.error || 'Fehler beim Löschen.';
                isError.value = true;
            } finally {
                loading.value = false;
            }
        }
    }

    async function deleteAnnouncement(id: string) {
        if (confirm('Soll diese Ankündigung wirklich gelöscht werden?')) {
            try {
                await hw.delete(`/api/announcements/${id}`);
                handleSuccess('Ankündigung erfolgreich gelöscht.');
            } catch (e: any) {
                message.value = e.response?.data?.error || 'Fehler beim Löschen.';
                isError.value = true;
            }
        }
    }

    async function doReport() {
        if (!reportTarget) return;

        const item = reportTarget;
        const reason = reportReason.value;

        cancelReport();

        message.value = 'Eintrag wird gemeldet...';
        isError.value = false;

        const payload = {
            itemId: item.id,
            itemTitle: item.title,
            reason: reason,
        };

        try {
            await hw.post('/api/reports', payload);

            message.value = 'Eintrag erfolgreich gemeldet. Wir nehmen das sehr ernst und schauen uns den Eintrag genau an.';
            isError.value = false;

        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Senden.';
            message.value = 'Fehler beim Melden: ' + errMsg;
            isError.value = true;
            console.error('reportItem error', e);
        } finally {
            setTimeout(() => { message.value = ''; isError.value = false }, 7000);
        }
    }

    function showImageForm(item: HwItem) {
        showImageFormFor.value = item;
    }

    function makeThumb(url: string) {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/');
            const uploadIdx = parts.findIndex(p => p === 'upload');
            if (uploadIdx !== -1) {
                parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto:best,w_120,h_120,c_fill');
                u.pathname = parts.join('/');
            }
            return u.toString();
        } catch {
            return url;
        }
    }

    function isChecked(itemId: string) {
        return checkedItems.value.has(itemId);
    }

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
            console.error('toggleCheck error', e);
            message.value = e.response?.data?.error || 'Fehler beim Setzen des Status.';
            isError.value = true;
            setTimeout(() => { message.value = ''; isError.value = false; }, 4000);
        }
    }

    function goTab(t: ItemType) {
        router.push({ name: 'ItemsByType', params: { type: t } });
    }

    const revealedImages = ref(new Set<string>());

    function isRevealed(itemId: string) {
        return revealedImages.value.has(itemId);
    }

    function revealImages(itemId: string) {
        revealedImages.value.add(itemId);
    }

    async function deleteSorge(id: string) {
        if (!confirm('Möchtest du diesen Sorgen-Eintrag wirklich löschen?')) {
            return;
        }

        try {
            await hw.delete(`/anon/sorgenfind/${id}`);
            await loadSorgen();
            handleSuccess('Sorgen-Eintrag erfolgreich gelöscht.');
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Löschen.';
            message.value = 'Fehler: ' + errMsg;
            isError.value = true;
            console.error('deleteSorge error', e);
            setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
        }
    }

    async function loadSorgen() {
        try {
            const res = await hw.get('/anon/sorgenfind');
            entriessorgen.value = res.data;
        } catch (e) {
            console.error('Konnte Sorgen nicht laden');
        }
    }



    // helper to trigger admin report load if admin on mount
    function loadReportsIfAdmin() {
        if (user.value?.isAdmin) loadReports();
    }


    return {
        // state
        user,
        subjects,
        announcements,
        items,
        loading,
        subjectFilter,
        showPersonalized,
        entriessorgen,
        showAuth,
        showItemForm,
        showAnnouncementForm,
        showImageFormFor,
        itemToEdit,
        MAX_TITLE_LENGTH,
        MAX_SUBJECT_LENGTH,
        message,
        isError,
        checkedItems,
        itemFormKey,
        expandedDescriptions,
        visibleCount,
        showReportConfirm,
        reportReason,
        reports,
        securityReport,
        isGeneratingReport,
        reportError,
        reportHtml,
        allUsers,
        loadingUsers,
        showActivityFor,
        userActivities,
        loadingActivities,
        deletingUsers,
        togglingBan,
        showOldEntries,
        showSetupModal,
        revealedImages,

        // computed
        filteredItems,
        limitedItems,

        // helpers
        colorFor,
        colorStyles,
        isExpanded,
        toggleDescription,
        showMore,
        showLess,
        toggleMenu,
        onMenuAction,
        reportItem,
        cancelReport,
        onSetupSuccess,
        openSetupModal,
        loadAllUsers,
        toggleUserActivity,
        deleteUser,
        toggleBan,
        loadReports,
        onDocumentClick,
        canManage,
        loadMe,
        loadCheckedForMe,
        loadSubjects,
        loadAnnouncements,
        reload,
        deleteReport,
        onAccountDeleted,
        onAccountDeleteError,
        generateSecurityReport,
        copyReportToClipboard,
        handleSuccess,
        onItemFormError,
        onLoggedIn,
        logout,
        editItem,
        openCreateForm,
        deleteItem,
        deleteAnnouncement,
        doReport,
        showImageForm,
        makeThumb,
        isChecked,
        toggleCheck,
        goTab,
        isRevealed,
        revealImages,
        deleteSorge,
        loadSorgen,
        loadReportsIfAdmin,
        tab
    };
}
