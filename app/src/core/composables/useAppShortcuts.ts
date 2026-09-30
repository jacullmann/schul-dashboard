import { onKeyStroke } from '@vueuse/core';
import { useModalStore } from '@/stores/modalStore';
import { useUserStore } from '@/stores/userStore';
import { useGroupAction } from '@/core/composables/useGroupAction';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

export function useAppShortcuts() {
  const modalStore = useModalStore();
  const userStore = useUserStore();
  const { withGroup } = useGroupAction();
  const { canInAnyGroup } = useAppAuth();

  // TODO(search-chat): disabled until search and chat are ready.
  // onKeyStroke(['k', 'K'], (e: KeyboardEvent) => {
  //   if (!userStore.user) return;
  //
  //   if (e.ctrlKey || e.metaKey) {
  //     e.preventDefault();
  //     modalStore.openSearch();
  //   }
  // });

  onKeyStroke(['n', 'N'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup((groupId) => modalStore.openTaskForm(groupId));
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
    if (!canInAnyGroup('manage_announcements')) return;

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      withGroup(
        (groupId) => modalStore.openAnnouncementForm(groupId),
        'manage_announcements',
      );
    }
  });

  // TODO(search-chat): disabled until search and chat are ready.
  // onKeyStroke(['g', 'G'], (e: KeyboardEvent) => {
  //   if (!userStore.user) return;
  //
  //   if (e.ctrlKey || e.metaKey) {
  //     e.preventDefault();
  //     modalStore.openSearch('group');
  //   }
  // });

  onKeyStroke(['d', 'D'], (e: KeyboardEvent) => {
    if (!userStore.user) return;

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      modalStore.toggleSidebar();
    }
  });
}
