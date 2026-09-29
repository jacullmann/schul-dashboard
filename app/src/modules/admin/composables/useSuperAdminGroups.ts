import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type {
  GroupSort,
  GroupTypeFilter,
  SortOrder,
  SuperAdminGroup,
} from '../types';
import { usePaginatedList } from './usePaginatedList';

export const GROUP_TYPE_FILTERS = [
  'all',
  'regular',
  'abitur',
] as const satisfies readonly GroupTypeFilter[];

const GROUP_SORTS = [
  'createdAt',
  'name',
  'memberCount',
  'itemCount',
] as const satisfies readonly GroupSort[];

const SORT_ORDERS = ['asc', 'desc'] as const satisfies readonly SortOrder[];

export function useSuperAdminGroups() {
  const toast = useToast();
  const modalStore = useModalStore();
  const { createInvite } = useAppAuth();
  const { t } = useI18n();

  const list = usePaginatedList<
    SuperAdminGroup,
    {
      search: string;
      type: GroupTypeFilter;
      sort: GroupSort;
      order: SortOrder;
    }
  >({
    endpoint: '/admin/groups',
    defaults: { search: '', type: 'all', sort: 'createdAt', order: 'desc' },
    allowed: {
      type: GROUP_TYPE_FILTERS,
      sort: GROUP_SORTS,
      order: SORT_ORDERS,
    },
    ascendingSorts: ['name'],
    onError: () => toast.error(t('admin.groups.errors.load')),
  });

  const invitingGroupId = ref<string | null>(null);

  async function inviteToGroup(group: SuperAdminGroup) {
    invitingGroupId.value = group.id;
    try {
      const res = await createInvite(group.id);
      if (res.ok && res.token) {
        modalStore.openInviteModal(res.token, group.id);
      } else {
        toast.error(res.error ?? t('auth.groups.errors.invite_failed'));
      }
    } finally {
      invitingGroupId.value = null;
    }
  }

  async function deleteGroup(group: SuperAdminGroup) {
    const confirmed = await modalStore.confirm({
      title: t('admin.groups.delete_modal.title'),
      content: t('admin.groups.delete_modal.content', { name: group.name }),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await hw.delete(`/admin/groups/${group.id}`);
      toast.success(t('admin.groups.delete_success', { name: group.name }));
      await list.reload();
    } catch {
      toast.error(t('admin.groups.errors.delete'));
    }
  }

  return { ...list, invitingGroupId, inviteToGroup, deleteGroup };
}
