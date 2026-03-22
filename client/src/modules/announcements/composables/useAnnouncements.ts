import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/hwApi';
import type { Announcement } from '@/modules/announcements/types';

export type { Announcement };

export function useAnnouncements() {
    const userStore = useUserStore();
    const { user } = storeToRefs(userStore);

    const announcements = ref<Announcement[]>([]);
    const loading = ref(false);
    /** Set of announcement IDs the current user has already seen as popups (server-backed). */
    const readPopupIds = ref<Set<string>>(new Set());

    async function loadAnnouncements() {
        loading.value = true;
        try {
            const { data } = await hw.get<Announcement[]>('/api/timetable/announcements');
            announcements.value = data;
        } catch (e) {
            console.error('Failed to load announcements', e);
        } finally {
            loading.value = false;
        }
    }

    /** Fetches the set of popup-read IDs from the server for the current user. */
    async function loadReadStatus() {
        if (!user.value) return;
        try {
            const { data } = await hw.get<string[]>('/api/timetable/announcements/read-status');
            readPopupIds.value = new Set(data);
        } catch {
            // Non-fatal: table may not exist yet pre-migration; treat all as unread
            readPopupIds.value = new Set();
        }
    }

    /** Returns true if the user has already seen this announcement popup. */
    function isPopupRead(announcementId: string): boolean {
        return readPopupIds.value.has(announcementId);
    }

    /**
     * Marks a popup announcement as seen for the current user.
     * Updates local state immediately for instant UI feedback, then persists to the server.
     */
    async function markPopupAsRead(announcementId: string): Promise<void> {
        if (readPopupIds.value.has(announcementId)) return;
        readPopupIds.value.add(announcementId);
        try {
            await hw.post(`/api/timetable/announcements/${announcementId}/read`);
        } catch {
            // Non-fatal: the optimistic local update already closed the popup
        }
    }

    async function deleteAnnouncement(id: string) {
        if (confirm('Delete announcement?')) {
            try {
                await hw.delete(`/api/group-admin/announcements/${id}`);
                await loadAnnouncements();
            } catch (e: unknown) {
                const err = e as { response?: { data?: { error?: string } } };
                alert(err.response?.data?.error || 'Failed to delete announcement.');
            }
        }
    }

    function canManage(): boolean {
        if (!user.value) return false;
        return user.value.role === 'superadmin';
    }

    const colorFor = (color: string): string => {
        const map: Record<string, string> = {
            'ok': 'var(--primary)',
            'warn': 'var(--warn)',
            'danger': 'var(--danger)',
            'expired': 'var(--gg)',
            'info': 'var(--primary)',
        };
        return map[color] || 'var(--sub)';
    };

    onMounted(() => {
        loadAnnouncements();
        loadReadStatus();
    });

    return {
        announcements,
        loading,
        readPopupIds,
        isPopupRead,
        markPopupAsRead,
        loadReadStatus,
        deleteAnnouncement,
        canManage,
        colorFor,
    };
}
