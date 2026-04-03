import { useRouter } from 'vue-router';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

export function useGroupAction() {
  const router = useRouter();
  const modalStore = useModalStore();
  const { activeGroupId, userGroups } = useAppAuth();

  const withGroup = (action: () => void) => {
    if (activeGroupId.value) {
      action();
    } else if (userGroups.value.length === 0) {
      router.push('/home');
    } else {
      modalStore.openSearch('group');
    }
  };

  return { withGroup };
}
