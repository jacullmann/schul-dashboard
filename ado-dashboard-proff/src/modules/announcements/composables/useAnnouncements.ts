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

    async function loadAnnouncements() {
        loading.value = true;
        try {
            const { data } = await hw.get<Announcement[]>('/api/announcements');
            announcements.value = data;
        } catch (e) {
            console.error('Failed to load announcements', e);
        } finally {
            loading.value = false;
        }
    }

    async function deleteAnnouncement(id: string) {
        if (confirm('Ankündigung löschen?')) {
            try {
                await hw.delete(`/api/announcements/${id}`);
                await loadAnnouncements();
            } catch (e: any) {
                alert(e.response?.data?.error || 'Fehler beim Löschen.');
            }
        }
    }

    function canManage(createdBy: string): boolean {
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
    });

    return {
        announcements,
        loading,
        deleteAnnouncement,
        canManage,
        colorFor
    };
}