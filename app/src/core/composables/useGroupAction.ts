import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

/**
 * Runs a group-bound action from anywhere in the app. Outside a group page it
 * targets the group this tab showed last; the action receives that group
 * explicitly and never relies on an ambient "current group".
 */
export function useGroupAction() {
  const router = useRouter();
  const { contextGroupId } = useAppAuth();

  const withGroup = (action: (groupId: string) => void) => {
    if (contextGroupId.value) {
      action(contextGroupId.value);
    } else {
      void router.push({ name: 'groups' });
    }
  };

  return { withGroup };
}
