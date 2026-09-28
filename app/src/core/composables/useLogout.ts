import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { usePushNotificationStore } from '@/stores/pushNotificationStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useMfa } from '@/modules/auth/composables/useMfa';

/**
 * Ends the session and returns to the app root. `useAppAuth().logout()` is what
 * calls `/auth/logout`; local state is cleared even if that request fails.
 * Push notifications are switched off first, while the session can still
 * remove the subscription, so the next person on this device gets none.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter();
  const userStore = useUserStore();
  const pushNotifications = usePushNotificationStore();
  const { logout: appAuthLogout } = useAppAuth();
  const { resetMfaState } = useMfa();

  return async () => {
    await pushNotifications.disable().catch(() => undefined);
    userStore.clearUser();
    resetMfaState();
    await appAuthLogout();
    await router.push('/');
  };
}
