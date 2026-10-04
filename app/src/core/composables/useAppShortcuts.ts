import { onKeyStroke } from '@vueuse/core';
import {
  useAnnouncementFormModal,
  usePrivateTaskFormModal,
  useSearchModal,
  useTaskFormModal,
} from '@/stores/modalStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useUserStore } from '@/stores/userStore';
import { useGroupAction } from '@/core/composables/useGroupAction';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

export function useAppShortcuts() {
  const searchModal = useSearchModal();
  const taskFormModal = useTaskFormModal();
  const privateTaskFormModal = usePrivateTaskFormModal();
  const announcementFormModal = useAnnouncementFormModal();
  const sidebarStore = useSidebarStore();
  const userStore = useUserStore();
  const { withGroup } = useGroupAction();
  const { canInAnyGroup } = useAppAuth();

  onKeyStroke(['k', 'K'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      searchModal.open();
    }
  });

  onKeyStroke(['n', 'N'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup((groupId) => taskFormModal.openNew(groupId));
    }
  });

  onKeyStroke(['p', 'P'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      privateTaskFormModal.openNew();
    }
  });

  onKeyStroke(['a', 'A'], (e: KeyboardEvent) => {
    if (!userStore.user) return;
    if (!canInAnyGroup('manage_announcements')) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup(
        (groupId) => announcementFormModal.openFor(groupId),
        'manage_announcements',
      );
    }
  });

  onKeyStroke(['g', 'G'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      searchModal.open('group');
    }
  });

  onKeyStroke(['d', 'D'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      sidebarStore.toggle();
    }
  });
}
