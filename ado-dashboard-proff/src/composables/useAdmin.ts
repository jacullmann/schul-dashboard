import { ref, computed, onMounted } from 'vue';
import hw from '../hwApi';
import { marked } from 'marked';

export interface AdminStats {
    userCount: number;
    itemCount: number;
    reportCount: number;
    reportCountTotal: number;
    reportCountProcessed: number;
    bannedCount: number;
    sorgeCount: number;
    sorgeCountTotal: number;
    sorgeCountProcessed: number;
    itemsByType: { _id: string; count: number }[];
    verifiedUsers: number;
    unverifiedUsers: number;
    adminCount: number;
    oldItemsCount: number;
    newUsersThisWeek: number;
    newItemsThisWeek: number;
    topCreators: { _id: string; count: number; email?: string }[];
}

export function useAdmin() {
    // --- State ---
    const activeTab = ref<'overview' | 'users' | 'reports' | 'security' | 'sorgen' | 'announcements' | 'timetable'>('overview');

    // Stats
    const stats = ref<AdminStats | null>(null);
    const loadingStats = ref(false);

    // Users
    const allUsers = ref<any[]>([]);
    const loadingUsers = ref(false);
    const showActivityFor = ref<string | null>(null);
    const userActivities = ref<Record<string, any[]>>({});
    const loadingActivities = ref<Record<string, boolean>>({});
    const deletingUsers = ref<Record<string, boolean>>({});
    const togglingBan = ref<Record<string, boolean>>({});

    const timetableSubs = ref<any[]>([]);
    const loadingSubs = ref(false);
    const savingSub = ref(false);
    const deletingSubs = ref<Record<string, boolean>>({});

    // Reports & Sorgen
    const reports = ref<any[]>([]);
    const entriessorgen = ref<any[]>([]);

    // Processing states
    const togglingReportProcessed = ref<Record<string, boolean>>({});
    const togglingSorgeProcessed = ref<Record<string, boolean>>({});

    // Cleanup
    const isCleaningUp = ref(false);

    // Security
    const securityReport = ref<string | null>(null);
    const isGeneratingReport = ref(false);
    const reportError = ref<string | null>(null);

    // UI Feedback
    const message = ref('');
    const isError = ref(false);

    // Computed: Getrennte Listen für Reports
    const unprocessedReports = computed(() =>
        reports.value.filter(r => !r.processed)
    );
    const processedReports = computed(() =>
        reports.value.filter(r => r.processed)
    );

    // Computed: Getrennte Listen für Sorgen
    const unprocessedSorgen = computed(() =>
        entriessorgen.value.filter(s => !s.processed)
    );
    const processedSorgen = computed(() =>
        entriessorgen.value.filter(s => s.processed)
    );

    // --- Actions ---

    function handleSuccess(msg: string) {
        message.value = msg;
        isError.value = false;
        setTimeout(() => { message.value = ''; }, 5000);
    }

    function handleError(msg: string) {
        message.value = msg;
        isError.value = true;
        setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
    }

    async function loadTimetableSubs() {
        loadingSubs.value = true;
        try {
            const { data } = await hw.get('/api/admin/timetable/subs');
            timetableSubs.value = data;
        } catch (e: any) {
            handleError('Fehler beim Laden der Substitutions');
        } finally {
            loadingSubs.value = false;
        }
    }

    async function saveTimetableSub(subData: any) {
        savingSub.value = true;
        try {
            const { data } = await hw.post('/api/admin/timetable/subs', subData);
            await loadTimetableSubs();
            handleSuccess('Substitution gespeichert');
            return data;
        } catch (e: any) {
            handleError('Fehler beim Speichern der Substitution');
            throw e;
        } finally {
            savingSub.value = false;
        }
    }

    async function deleteTimetableSub(id: string) {
        if (!confirm('Substitution wirklich löschen?')) return;
        deletingSubs.value[id] = true;
        try {
            await hw.delete(`/api/admin/timetable/subs/${id}`);
            await loadTimetableSubs();
            handleSuccess('Substitution gelöscht');
        } catch (e: any) {
            handleError('Fehler beim Löschen der Substitution');
        } finally {
            deletingSubs.value[id] = false;
        }
    }

    // Stats
    async function loadStats() {
        loadingStats.value = true;
        try {
            const { data } = await hw.get('/api/admin/stats');
            stats.value = data;
        } catch (e) {
            console.error(e);
        } finally {
            loadingStats.value = false;
        }
    }

    // Users
    async function loadAllUsers() {
        loadingUsers.value = true;
        try {
            const { data } = await hw.get('/api/admin/all-users');
            allUsers.value = data;
        } catch (e: any) {
            handleError(e.response?.data?.error || 'Fehler beim Laden der Benutzer');
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
            handleError('Fehler beim Laden der Aktivitäten');
        } finally {
            loadingActivities.value[userId] = false;
        }
    }

    async function toggleBan(targetUser: any) {
        if (!targetUser || targetUser.isAdmin) return;
        togglingBan.value[targetUser.id] = true;
        try {
            if (targetUser.isBanned) {
                await hw.delete(`/api/admin/users/${targetUser.id}/ban`);
                targetUser.isBanned = false;
                handleSuccess('Benutzer entsperrt.');
            } else {
                await hw.post(`/api/admin/users/${targetUser.id}/ban`);
                targetUser.isBanned = true;
                handleSuccess('Benutzer gesperrt.');
            }
            loadStats();
        } catch (e: any) {
            handleError('Fehler beim Ändern des Status.');
        } finally {
            togglingBan.value[targetUser.id] = false;
        }
    }

    async function deleteUser(userId: string) {
        if (!confirm('Benutzer wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) return;
        deletingUsers.value[userId] = true;
        try {
            await hw.delete(`/api/admin/users/${userId}`);
            handleSuccess('Benutzer gelöscht');
            allUsers.value = allUsers.value.filter(u => u.id !== userId);
            loadStats();
        } catch (e: any) {
            handleError('Fehler beim Löschen.');
        } finally {
            deletingUsers.value[userId] = false;
        }
    }

    // Reports
    async function loadReports() {
        try {
            const { data } = await hw.get('/api/admin/reports');
            reports.value = data;
        } catch (e) { console.error(e); }
    }

    async function deleteReport(id: string) {
        if (!confirm('Meldung löschen?')) return;
        try {
            await hw.delete(`/api/admin/reports/${id}`);
            // Optimistic update
            reports.value = reports.value.filter(r => r._id !== id);
            handleSuccess('Meldung gelöscht.');
            loadStats();
        } catch (e) { handleError('Fehler beim Löschen.'); }
    }

    async function toggleReportProcessed(id: string, currentProcessed: boolean) {
        togglingReportProcessed.value[id] = true;
        const newProcessed = !currentProcessed;
        try {
            await hw.patch(`/api/admin/reports/${id}/processed`, { processed: newProcessed });
            // Optimistic update
            const report = reports.value.find(r => r._id === id);
            if (report) {
                report.processed = newProcessed;
                report.processedAt = newProcessed ? new Date().toISOString() : null;
            }
            handleSuccess(newProcessed ? 'Als bearbeitet markiert.' : 'Als nicht bearbeitet markiert.');
            loadStats(); // Stats neu laden für Counter
        } catch (e: any) {
            handleError('Fehler beim Ändern des Status.');
        } finally {
            togglingReportProcessed.value[id] = false;
        }
    }

    // Sorgen
    async function loadSorgen() {
        try {
            const { data } = await hw.get('/anon/sorgenfind');
            entriessorgen.value = data;
        } catch (e) { console.error(e); }
    }

    async function deleteSorge(id: string) {
        if (!confirm('Sorgen-Eintrag löschen?')) return;
        try {
            await hw.delete(`/anon/sorgenfind/${id}`);
            // Optimistic update
            entriessorgen.value = entriessorgen.value.filter(s => s._id !== id);
            handleSuccess('Eintrag gelöscht.');
            loadStats();
        } catch (e) { handleError('Fehler beim Löschen.'); }
    }

    async function toggleSorgeProcessed(id: string, currentProcessed: boolean) {
        togglingSorgeProcessed.value[id] = true;
        const newProcessed = !currentProcessed;
        try {
            await hw.patch(`/anon/sorgenfind/${id}/processed`, { processed: newProcessed });
            // Optimistic update
            const sorge = entriessorgen.value.find(s => s._id === id);
            if (sorge) {
                sorge.processed = newProcessed;
                sorge.processedAt = newProcessed ? new Date().toISOString() : null;
            }
            handleSuccess(newProcessed ? 'Als bearbeitet markiert.' : 'Als nicht bearbeitet markiert.');
            loadStats();
        } catch (e: any) {
            handleError('Fehler beim Ändern des Status.');
        } finally {
            togglingSorgeProcessed.value[id] = false;
        }
    }

    // Cleanup
    async function cleanupOldItems() {
        if (!confirm('Wirklich alle Einträge löschen, die älter als 90 Tage sind? Dies kann nicht rückgängig gemacht werden!')) return;
        isCleaningUp.value = true;
        try {
            const { data } = await hw.delete('/api/admin/cleanup/old-items');
            handleSuccess(data.message || `${data.deletedItems} Einträge gelöscht.`);
            loadStats();
        } catch (e: any) {
            handleError(e.response?.data?.error || 'Fehler beim Bereinigen.');
        } finally {
            isCleaningUp.value = false;
        }
    }

    // Security
    async function generateSecurityReport() {
        if (isGeneratingReport.value) return;
        isGeneratingReport.value = true;
        securityReport.value = null;
        reportError.value = null;
        try {
            const { data } = await hw.post('/api/admin/security-report', {}, { timeout: 300000 });
            securityReport.value = data.report;
        } catch (e: any) {
            reportError.value = e.response?.data?.error || 'Fehler beim Generieren.';
        } finally {
            isGeneratingReport.value = false;
        }
    }

    async function pruneOldLogs(user: any) {
        if (!confirm(`Möchtest du wirklich alle Logs von ${user.email} löschen, die älter als 30 Tage sind?`)) {
            return;
        }

        try {
            const { data } = await hw.delete(`/api/admin/users/${user.id}/activity/prune`);
            if (data.ok) {
                handleSuccess('Alte Logs erfolgreich gelöscht.');
                loadAllUsers();
            }
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.error || 'Fehler beim Löschen der Logs.');
        }
    }

    function copyReportToClipboard() {
        if (!securityReport.value) return;
        navigator.clipboard.writeText(securityReport.value)
            .then(() => handleSuccess('Kopiert!'))
            .catch(() => handleError('Fehler beim Kopieren.'));
    }

    // Init
    onMounted(() => {
        loadStats();
        loadAllUsers();
        loadReports();
        loadSorgen();
        loadTimetableSubs();
    });

    return {
        activeTab,
        stats,
        loadingStats,
        allUsers,
        loadingUsers,
        showActivityFor,
        userActivities,
        loadingActivities,
        deletingUsers,
        togglingBan,
        reports,
        entriessorgen,
        // Neue computed properties
        unprocessedReports,
        processedReports,
        unprocessedSorgen,
        processedSorgen,
        // Processing toggles
        togglingReportProcessed,
        togglingSorgeProcessed,
        toggleReportProcessed,
        toggleSorgeProcessed,
        // Cleanup
        isCleaningUp,
        cleanupOldItems,
        // Rest
        securityReport,
        isGeneratingReport,
        reportError,
        reportHtml: securityReport,
        message,
        isError,
        handleSuccess,
        handleError,
        loadStats,
        loadAllUsers,
        toggleUserActivity,
        toggleBan,
        deleteUser,
        deleteReport,
        deleteSorge,
        generateSecurityReport,
        copyReportToClipboard,
        timetableSubs,
        loadingSubs,
        savingSub,
        deletingSubs,
        loadTimetableSubs,
        saveTimetableSub,
        deleteTimetableSub,
        pruneOldLogs,
        loadReports,
        loadSorgen
    };
}