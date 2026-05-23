import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';
import type { Announcement } from '@/modules/announcements/types';

const modalStore = useModalStore();

export type { Announcement };

export function useAnnouncements() {
  const userStore = useUserStore();
  const { user } = storeToRefs(userStore);
  const toast = useToast();

  const announcements = ref<Announcement[]>([]);
  const loading = ref(false);
  const seenIds = ref<Set<string>>(new Set());

  async function loadAnnouncements(): Promise<void> {
    loading.value = true;
    try {
      const { data } = await hw.get<Announcement[]>(
        '/api/schedule/announcements',
      );
      announcements.value = data;
    } catch (e) {
      console.error('Failed to load announcements', e);
    } finally {
      loading.value = false;
    }
  }

  async function loadSeenIds(): Promise<void> {
    if (!user.value) return;
    try {
      const { data } = await hw.get<string[]>(
        '/api/schedule/announcements/read-status',
      );
      seenIds.value = new Set(data);
    } catch {
      seenIds.value = new Set();
    }
  }

  async function markAsSeen(announcementId: string): Promise<void> {
    if (seenIds.value.has(announcementId)) return;
    seenIds.value.add(announcementId);
    try {
      await hw.post(`/api/schedule/announcements/${announcementId}/read`);
    } catch {}
  }

  async function checkAndNotifyUnread(): Promise<void> {
    if (user.value) {
      await Promise.all([loadAnnouncements(), loadSeenIds()]);
    } else {
      await loadAnnouncements();
      return;
    }

    const unread = announcements.value.filter((a) => !seenIds.value.has(a.id));
    if (!unread.length) return;

    const count = unread.length;
    const firstContent = unread[0]!.content;
    const preview =
      firstContent.length > 80 ? firstContent.slice(0, 80) + '…' : firstContent;
    const msg =
      count === 1
        ? `Neue Ankündigung: ${preview}`
        : `${count} neue Ankündigungen: ${preview}`;

    const hasDanger = unread.some((a) => a.color === 'danger');
    const hasWarn = unread.some((a) => a.color === 'warn');
    const duration = Math.min(10000, 5000 + count * 1000);

    if (hasDanger) {
      toast.error(msg, duration);
    } else if (hasWarn) {
      toast.warning(msg, duration);
    } else {
      toast.info(msg, duration);
    }

    void Promise.all(unread.map((a) => markAsSeen(a.id)));
  }

  async function deleteAnnouncement(id: string): Promise<void> {
    const isConfirmed = await modalStore.confirm({
      title: 'Diese Ankündigung löschen?',
      content:
        'Wenn du diese Ankündigung löschst, wird sie unwiderruflich entfernt.',
      submitText: 'Löschen',
      danger: true,
    });

    if (!isConfirmed) return;
    try {
      await hw.delete(`/api/group-admin/announcements/${id}`);
      announcements.value = announcements.value.filter((a) => a.id !== id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(
        err.response?.data?.error ||
          'Ankündigung konnte nicht gelöscht werden.',
      );
    }
  }

  function colorFor(color: string): string {
    if (color === 'info') return 'is-surface';
    const list = ['warn', 'danger'];
    return list.includes(color) ? `is-${color}` : 'is-default';
  }

  return {
    announcements,
    loading,
    loadAnnouncements,
    checkAndNotifyUnread,
    deleteAnnouncement,
    colorFor,
  };
}
