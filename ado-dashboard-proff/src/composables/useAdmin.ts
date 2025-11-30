import { ref, computed } from 'vue';
import hw from '../hwApi';
import { marked } from 'marked';

export function useAdmin() {
    // Admin / User Management State
    const allUsers = ref<any[]>([]);
    const loadingUsers = ref(false);
    const showActivityFor = ref<string | null>(null);
    const userActivities = ref<Record<string, any[]>>({});
    const loadingActivities = ref<Record<string, boolean>>({});
    const deletingUsers = ref<Record<string, boolean>>({});
    const togglingBan = ref<Record<string, boolean>>({});
    const reports = ref<any[]>([]);
    const entriessorgen = ref<any[]>([]);
    const announcements = ref<any[]>([]);

    // Security Report State
    const securityReport = ref<string | null>(null);
    const isGeneratingReport = ref(false);
    const reportError = ref<string | null>(null);

    // UI Messages
    const message = ref('');
    const isError = ref(false);

    // Computed
    const reportHtml = computed(() => {
        if (securityReport.value) {
            return marked.parse(securityReport.value);
        }
        return '';
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

    function handleSuccess(msg: string) {
        message.value = msg;
        isError.value = false;
        setTimeout(() => message.value = '', 5000);
        loadAllUsers();
        loadReports();
        loadSorgen();
        loadAnnouncements();
    }

    function handleError(msg: string) {
        message.value = msg || 'Ein Fehler ist aufgetreten.';
        isError.value = true;
        setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
    }

    // Admin Actions
    async function loadAllUsers() {
        loadingUsers.value = true;
        try {
            const { data } = await hw.get('/api/admin/all-users');
            allUsers.value = data;
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Laden der Benutzer';
            handleError(errMsg);
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
            handleError(errMsg);
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
            handleError(errMsg);
        } finally {
            deletingUsers.value[userId] = false;
        }
    }

    async function toggleBan(targetUser: any) {
        if (!targetUser || targetUser.isAdmin) return;
        togglingBan.value[targetUser.id] = true;
        try {
            if (targetUser.isBanned) {
                await hw.delete(`/api/admin/users/${targetUser.id}/ban`);
                targetUser.isBanned = false;
                handleSuccess('Benutzer erfolgreich entsperrt.');
            } else {
                await hw.post(`/api/admin/users/${targetUser.id}/ban`);
                targetUser.isBanned = true;
                handleSuccess('Benutzer erfolgreich gesperrt.');
            }
        } catch (e: any) {
            const errMsg = e.response?.data?.error || 'Fehler beim Ändern des Sperr-Status des Accounts.';
            handleError(errMsg);
        } finally {
            togglingBan.value[targetUser.id] = false;
        }
    }

    async function loadReports() {
        try {
            const { data } = await hw.get('/api/admin/reports');
            reports.value = data;
        } catch (e) {
            console.error('loadReports error', e);
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
            handleError(errMsg);
        }
    }

    // Security Report
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
            handleError(errMsg);
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
                handleError('Fehler beim Kopieren.');
            });
    }

    // Sorgen / Feedback Logic
    async function loadSorgen() {
        try {
            const res = await hw.get('/anon/sorgenfind');
            entriessorgen.value = res.data;
        } catch (e) {
            console.error('Konnte Sorgen nicht laden');
        }
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
            handleError(errMsg);
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

    async function deleteAnnouncement(id: string) {
        if (confirm('Soll diese Ankündigung wirklich gelöscht werden?')) {
            try {
                await hw.delete(`/api/announcements/${id}`);
                handleSuccess('Ankündigung erfolgreich gelöscht.');
            } catch (e: any) {
                const errMsg = e.response?.data?.error || 'Fehler beim Löschen.';
                handleError(errMsg);
            }
        }
    }


    return {
        allUsers,
        loadingUsers,
        showActivityFor,
        userActivities,
        loadingActivities,
        deletingUsers,
        togglingBan,
        reports,
        securityReport,
        isGeneratingReport,
        reportError,
        reportHtml,
        message,
        isError,
        entriessorgen,
        announcements,
        colorFor,
        loadAllUsers,
        toggleUserActivity,
        deleteUser,
        toggleBan,
        loadReports,
        deleteReport,
        generateSecurityReport,
        copyReportToClipboard,
        loadSorgen,
        deleteSorge,
        loadAnnouncements,
        deleteAnnouncement,
        handleSuccess,
        handleError
    };
}