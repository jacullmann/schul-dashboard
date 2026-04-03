import { onKeyStroke } from '@vueuse/core';
import { useModalStore } from '@/stores/modalStore';
import { useUserStore } from '@/stores/userStore';
import { useGroupAction } from '@/core/composables/useGroupAction';

/**
 * Global application shortcuts
 */
export function useAppShortcuts() {
  const modalStore = useModalStore();
  const userStore = useUserStore();
  const { withGroup } = useGroupAction();

  /*
  const isEditable = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement | null;
    if (!target) return false;

    const tag = target.tagName?.toUpperCase();
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      target.isContentEditable
    );
  };
  */

  // Ctrl/Cmd+K → Search
  onKeyStroke(['k', 'K'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      modalStore.openSearch();
    }
  });

  // Alt+N → Create new entry
  onKeyStroke(['n', 'N'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup(() => {
        modalStore.openItemForm();
      });
    }
  });

  // Alt+P → Create new private entry
  onKeyStroke(['p', 'P'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      modalStore.openPrivateTaskForm();
    }
  });

  // Alt+A → Create new announcement (admins only)
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

  // Ctrl/Cmd+G → Group Switch
  onKeyStroke(['g', 'G'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      modalStore.openSearch('group');
    }
  });

  // Ctrl/Cmd+Shift+D → Toggle Sidebar
  onKeyStroke(['d', 'D'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      modalStore.toggleSidebar();
    }
  });
}
