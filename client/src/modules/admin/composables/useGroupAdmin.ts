import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '@/api/hwApi';
import type {
    GroupMember,
    GroupStats,
    TimetableSubstitution,
    AdminAnnouncement
} from '@/modules/admin/types';
import type { Lesson } from '@/modules/schedule/types';

export function useGroupAdmin() {
    const route = useRoute();
    const { groupName: authGroupName } = useAppAuth();

    const groupId = computed(() => route.params.groupId as string);
    const groupName = computed(() => authGroupName.value || 'Gruppe');

    // UI State
    const activeTab = ref('overview');
    const message = ref('');
    const isError = ref(false);

    // Stats
    const stats = ref<GroupStats | null>(null);
    const loadingStats = ref(false);

    // Members
    const members = ref<GroupMember[]>([]);
    const loadingMembers = ref(false);

    // Timetable subs
    const subs = ref<TimetableSubstitution[]>([]);
    const loadingSubs = ref(false);
    const savingSub = ref(false);

    // Timetable
    const lessons = ref<Lesson[]>([]);
    const loadingLessons = ref(false);

    // Announcements
    const announcements = ref<AdminAnnouncement[]>([]);
    const creatingAnn = ref(false);

    // Cleanup
    const cleaningUp = ref(false);

    // Group settings
    const editingGroupName = ref(false);
    const newGroupName = ref('');
    const savingGroupName = ref(false);

    // ─── Helpers ────────────────────────────────────────

    function showMessage(msg: string, error = false) {
        message.value = msg;
        isError.value = error;
        setTimeout(() => { message.value = ''; }, 4000);
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // ─── Stats ──────────────────────────────────────────

    async function loadStats() {
        loadingStats.value = true;
        try {
            const { data } = await hw.get('/api/group-admin/stats');
            stats.value = data;
        } catch {
            showMessage('Fehler beim Laden der Statistiken', true);
        } finally {
            loadingStats.value = false;
        }
    }

    // ─── Members ────────────────────────────────────────

    async function loadMembers() {
        loadingMembers.value = true;
        try {
            const { data } = await hw.get('/api/group-admin/members');
            members.value = data;
        } catch {
            showMessage('Fehler beim Laden der Mitglieder', true);
        } finally {
            loadingMembers.value = false;
        }
    }

    async function changeRole(userId: string, newRole: string) {
        try {
            await hw.patch(`/api/group-admin/members/${userId}/role`, { role: newRole });
            const member = members.value.find(m => m.userId === userId);
            if (member) member.role = newRole;
            showMessage('Rolle geändert');
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || 'Fehler beim Ändern der Rolle', true);
            // Reload to revert optimistic change
            await loadMembers();
        }
    }

    async function removeMember(userId: string, name: string) {
        if (!confirm(`${name} wirklich aus der Gruppe entfernen?`)) return;
        try {
            await hw.delete(`/api/group-admin/members/${userId}`);
            members.value = members.value.filter(m => m.userId !== userId);
            showMessage('Mitglied entfernt');
            loadStats();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || 'Fehler beim Entfernen', true);
        }
    }

    // ─── Timetable Subs ─────────────────────────────────

    async function loadTimetable() {
        loadingLessons.value = true;
        try {
            const { data } = await hw.get('/api/group-admin/timetable');
            lessons.value = data;
        } catch {
            showMessage('Fehler beim Laden des Stundenplans', true);
        } finally {
            loadingLessons.value = false;
        }
    }

    async function loadSubs() {
        loadingSubs.value = true;
        try {
            const { data } = await hw.get('/api/group-admin/timetable/subs');
            subs.value = data;
        } catch {
            showMessage('Fehler beim Laden', true);
        } finally {
            loadingSubs.value = false;
        }
    }

    async function saveSub(subData: Record<string, unknown>) {
        if (!subData.lessonId) return;
        savingSub.value = true;
        try {
            await hw.post('/api/group-admin/timetable/subs', subData);
            await loadSubs();
            showMessage('Substitution gespeichert');
        } catch {
            showMessage('Fehler beim Speichern', true);
        } finally {
            savingSub.value = false;
        }
    }

    async function deleteSub(id: string) {
        if (!confirm('Substitution löschen?')) return;
        try {
            await hw.delete(`/api/group-admin/timetable/subs/${id}`);
            subs.value = subs.value.filter(s => s.id !== id);
            showMessage('Gelöscht');
        } catch {
            showMessage('Fehler beim Löschen', true);
        }
    }

    // ─── Announcements ──────────────────────────────────

    async function loadAnnouncements() {
        try {
            const { data } = await hw.get('/api/timetable/announcements');
            announcements.value = data;
        } catch { /* ignore */ }
    }

    async function createAnnouncement(content: string, color: string, showAsPopup = false) {
        if (!content.trim()) return;
        creatingAnn.value = true;
        try {
            await hw.post('/api/group-admin/announcements', {
                content: content.trim(),
                color,
                showAsPopup,
            });
            await loadAnnouncements();
            showMessage('Ankündigung erstellt');
        } catch {
            showMessage('Fehler beim Erstellen', true);
        } finally {
            creatingAnn.value = false;
        }
    }

    async function deleteAnnouncement(id: string) {
        if (!confirm('Ankündigung löschen?')) return;
        try {
            await hw.delete(`/api/group-admin/announcements/${id}`);
            announcements.value = announcements.value.filter(a => a.id !== id);
            showMessage('Gelöscht');
        } catch {
            showMessage('Fehler beim Löschen', true);
        }
    }

    // ─── Cleanup ────────────────────────────────────────

    async function cleanupOldItems() {
        if (!confirm('Alle Einträge älter als 90 Tage löschen?')) return;
        cleaningUp.value = true;
        try {
            const { data } = await hw.delete('/api/group-admin/cleanup/old-items');
            showMessage(data.message || 'Bereinigung abgeschlossen');
            await loadStats();
        } catch {
            showMessage('Fehler bei der Bereinigung', true);
        } finally {
            cleaningUp.value = false;
        }
    }

    // ─── Group Settings ─────────────────────────────────

    function startEditGroupName() {
        newGroupName.value = groupName.value || '';
        editingGroupName.value = true;
    }

    function cancelEditGroupName() {
        editingGroupName.value = false;
        newGroupName.value = '';
    }

    async function saveGroupName() {
        if (!newGroupName.value.trim()) return;
        savingGroupName.value = true;
        try {
            await hw.patch('/api/group-admin/settings', {
                name: newGroupName.value.trim()
            });
            showMessage('Gruppenname geändert');
            editingGroupName.value = false;
            // Force reload to update name everywhere
            window.location.reload();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || 'Fehler beim Speichern', true);
        } finally {
            savingGroupName.value = false;
        }
    }

    // ─── Init ───────────────────────────────────────────

    onMounted(() => {
        loadStats();
        loadMembers();
        loadSubs();
        loadAnnouncements();
        loadTimetable();
    });

    return {
        groupId,
        groupName,
        activeTab,
        message,
        isError,

        // Stats
        stats,
        loadingStats,
        loadStats,

        // Members
        members,
        loadingMembers,
        loadMembers,
        changeRole,
        removeMember,

        // Subs
        subs,
        loadingSubs,
        savingSub,
        loadSubs,
        saveSub,
        deleteSub,

        // Timetable
        lessons,
        loadingLessons,
        loadTimetable,

        // Announcements
        announcements,
        creatingAnn,
        loadAnnouncements,
        createAnnouncement,
        deleteAnnouncement,

        // Cleanup
        cleaningUp,
        cleanupOldItems,

        // Settings
        editingGroupName,
        newGroupName,
        savingGroupName,
        startEditGroupName,
        cancelEditGroupName,
        saveGroupName,

        // Helpers
        showMessage,
        formatDate,
    };
}