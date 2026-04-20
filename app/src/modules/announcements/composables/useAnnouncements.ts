import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';
import type { Announcement } from '@/modules/announcements/types';

export type { Announcement };

export function useAnnouncements() {
  const userStore = useUserStore();
  const { user } = storeToRefs(userStore);
  const toast = useToast();

  const announcements = ref<Announcement[]>([]);
  const loading = ref(false);
  /** Server-backed set of announcement IDs the current user has already seen. */
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
      // Non-fatal: treat all as unseen if the table isn't reachable
      seenIds.value = new Set();
    }
  }

  async function markAsSeen(announcementId: string): Promise<void> {
    if (seenIds.value.has(announcementId)) return;
    seenIds.value.add(announcementId);
    try {
      await hw.post(`/api/schedule/announcements/${announcementId}/read`);
    } catch {
      // Non-fatal: local optimistic update already prevents re-showing
    }
  }

  /**
   * Loads announcements and seen-status in parallel to avoid race conditions,
   * then shows a single toast for any unseen announcements and marks them read.
   * Only shows a toast when the user is authenticated.
   */
  async function checkAndNotifyUnread(): Promise<void> {
    if (user.value) {
      await Promise.all([loadAnnouncements(), loadSeenIds()]);
    } else {
      // Guest: load announcements for the bar but skip notification
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
        : `${count} neue Ankündigungen – ${preview}`;

    // Use the highest severity of all unread items
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

    // Mark all as seen (fire-and-forget, parallel)
    void Promise.all(unread.map((a) => markAsSeen(a.id)));
  }

  async function deleteAnnouncement(id: string): Promise<void> {
    if (!confirm('Ankündigung löschen?')) return;
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
