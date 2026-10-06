import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import api from '@/api/api.ts';
import type { SystemAnnouncement } from '@/modules/announcements/types';

/** The platform's running announcements to every user, newest first. */
export const useSystemAnnouncementStore = defineStore(
  'system-announcements',
  () => {
    const announcements = ref<SystemAnnouncement[]>([]);

    const unread = computed(() => announcements.value.filter((a) => !a.read));

    async function load() {
      try {
        const { data } = await api.get<SystemAnnouncement[]>(
          '/system-announcements',
        );
        announcements.value = data;
      } catch (e) {
        console.error('Failed to load system announcements', e);
      }
    }

    async function markRead(ids: string[]) {
      if (ids.length === 0) return;
      for (const announcement of announcements.value) {
        if (ids.includes(announcement.id)) announcement.read = true;
      }
      try {
        await api.post('/system-announcements/read', { ids });
      } catch {
        // Already marked locally; a failed sync shows them again on the next load.
      }
    }

    function markAllRead() {
      return markRead(unread.value.map((a) => a.id));
    }

    return { announcements, unread, load, markRead, markAllRead };
  },
);
