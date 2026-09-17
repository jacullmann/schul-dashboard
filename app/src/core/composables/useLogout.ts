import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useMfa } from '@/modules/auth/composables/useMfa';

/**
 * Ends the session and returns to the app root. `useAppAuth().logout()` is what
 * calls `/auth/logout`; local state is cleared even if that request fails.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter();
  const userStore = useUserStore();
  const { logout: appAuthLogout } = useAppAuth();
  const { resetMfaState } = useMfa();

  return async () => {
    userStore.clearUser();
    resetMfaState();
    await appAuthLogout();
    await router.push('/');
  };
}
