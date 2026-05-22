import { onKeyStroke } from '@vueuse/core';
import { useModalStore } from '@/stores/modalStore';
import { useUserStore } from '@/stores/userStore';
import { useGroupAction } from '@/core/composables/useGroupAction';

export function useAppShortcuts() {
  const modalStore = useModalStore();
  const userStore = useUserStore();
  const { withGroup } = useGroupAction();

  onKeyStroke(['k', 'K'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      modalStore.openSearch();
    }
  });

  onKeyStroke(['n', 'N'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup(() => {
        modalStore.openItemForm();
      });
    }
  });

  onKeyStroke(['p', 'P'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      modalStore.openPrivateTaskForm();
    }
  });

  onKeyStroke(['a', 'A'], (e: KeyboardEvent) => {
    if (!userStore.user) return;
    if (!userStore.isGroupAdmin && !userStore.isSuperadmin) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup(() => {
        modalStore.openAnnouncementForm();
      });
    }
  });

  onKeyStroke(['g', 'G'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      modalStore.openSearch('group');
    }
  });

  onKeyStroke(['d', 'D'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      modalStore.toggleSidebar();
    }
  });
}
