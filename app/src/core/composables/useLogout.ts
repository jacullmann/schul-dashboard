import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { clearLoginReturn } from '@/modules/auth/utils/loginReturn';

/**
 * Ends the session and shows the login page. `useAppAuth().logout()` is what
 * calls `/auth/logout`; local state is cleared even if that request fails.
 *
 * The login route is targeted directly: `/` redirects to `/groups`, which is a
 * no-op navigation when the user is already there, so the auth guard never runs.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter();
  const userStore = useUserStore();
  const { logout: appAuthLogout } = useAppAuth();
  const { resetMfaState } = useMfa();

  return async () => {
    userStore.clearUser();
    resetMfaState();
    clearLoginReturn();
    await appAuthLogout();
    await router.push({ name: 'login' });
  };
}
