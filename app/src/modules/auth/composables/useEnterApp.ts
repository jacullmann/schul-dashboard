import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

/** Loads the account that just signed in and opens its home page. */
export function useEnterApp() {
  const router = useRouter();
  const userStore = useUserStore();
  const { checkAuthStatus, homeRoute } = useAppAuth();

  return async function enterApp() {
    try {
      await checkAuthStatus();
      await userStore.fetchUser();
    } catch {
      // Signed in; navigate anyway and let the route guard re-sync.
    }
    await router.push(homeRoute.value);
  };
}
