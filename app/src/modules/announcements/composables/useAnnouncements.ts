import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import { groupPath } from '@/api/groupPath';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useToast } from '@/common/composables/useToast';
import type { Announcement } from '@/modules/announcements/types';

export function useAnnouncements() {
  const { t } = useI18n();
  const toast = useToast();
  const { activeGroupId } = useAppAuth();

  const announcements = ref<Announcement[]>([]);

  async function loadAnnouncements(): Promise<void> {
    const groupId = activeGroupId.value;
    if (!groupId) return;
    try {
      const { data } = await hw.get<Announcement[]>(
        groupPath(groupId, '/announcements'),
      );
      announcements.value = data;
    } catch (e) {
      console.error('Failed to load announcements', e);
    }
  }

  async function markAsRead(unread: Announcement[]): Promise<void> {
    const groupId = activeGroupId.value;
    if (!groupId) return;
    for (const announcement of unread) announcement.read = true;
    try {
      await hw.post(groupPath(groupId, '/announcements/read'), {
        ids: unread.map((a) => a.id),
      });
    } catch {
      // Already marked locally; a failed sync shows them again on the next load.
    }
  }

  async function checkAndNotifyUnread(): Promise<void> {
    await loadAnnouncements();

    const unread = announcements.value.filter((a) => !a.read);
    if (!unread.length) return;

    const count = unread.length;
    const firstContent = unread[0]!.content;
    const preview =
      firstContent.length > 80 ? firstContent.slice(0, 80) + '…' : firstContent;
    const msg =
      count === 1
        ? t('announcements.notifications.new_single', { preview })
        : t('announcements.notifications.new_plural', { count, preview });

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

    void markAsRead(unread);
  }

  return {
    announcements,
    checkAndNotifyUnread,
  };
}
