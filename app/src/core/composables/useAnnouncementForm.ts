import { useModalStore } from '@/stores/modalStore';

/**
 * Thin composable wrapper around the modal store's announcement-form slice.
 * Call-sites should use this instead of importing the store directly.
 */
export function useAnnouncementForm() {
  const store = useModalStore();

  return {
    isAnnouncementFormOpen: store.announcementFormOpen as Readonly<
      typeof store.announcementFormOpen
    >,
    announcementFormKey: store.announcementFormKey,
    openAnnouncementForm: store.openAnnouncementForm,
    closeAnnouncementForm: store.closeAnnouncementForm,
    notifySuccess: store.notifyAnnouncementFormSuccess,
    onFormSuccess: store.onAnnouncementFormSuccess,
  };
}
