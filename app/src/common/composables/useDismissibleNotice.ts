import { computed } from 'vue';
import hw from '@/api/api.ts';
import { useUserStore, type DismissibleNotice } from '@/stores/userStore';

export function useDismissibleNotice(notice: DismissibleNotice) {
  const userStore = useUserStore();

  const isDismissed = computed(() => userStore.isNoticeDismissed(notice));

  function dismiss(): void {
    if (!userStore.isLoggedIn || isDismissed.value) return;

    userStore.markNoticeDismissed(notice);

    // Hidden locally first; a failed sync only brings it back on the next load.
    void hw.put(`/user/dismissed-notices/${notice}`).catch((err) => {
      console.error(
        `Failed to sync dismissed notice ${notice} to backend`,
        err,
      );
    });
  }

  return { isDismissed, dismiss };
}
