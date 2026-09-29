import { useModalStore } from '@/stores/modalStore';

export function useAnnouncementForm() {
  const store = useModalStore();

  return {
    isAnnouncementFormOpen: store.announcementFormOpen as Readonly<
      typeof store.announcementFormOpen
    >,
    announcementFormKey: store.announcementFormKey,
    openAnnouncementForm: (groupId: string, options?: { local?: boolean }) =>
      store.openAnnouncementForm(groupId, options),
    closeAnnouncementForm: store.closeAnnouncementForm,
    notifySuccess: store.notifyAnnouncementFormSuccess,
    onFormSuccess: store.onAnnouncementFormSuccess,
  };
}
