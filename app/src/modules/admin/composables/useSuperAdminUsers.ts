import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useConfirmModal } from '@/stores/modalStore';
import type {
  SortOrder,
  SuperAdminUser,
  UserSort,
  UserStatusFilter,
} from '../types';
import { usePaginatedList } from './usePaginatedList';
import { useSuperAdminStats } from './useSuperAdminStats';

export const USER_STATUS_FILTERS = [
  'all',
  'active',
  'banned',
  'unverified',
  'superadmin',
] as const satisfies readonly UserStatusFilter[];

const USER_SORTS = [
  'createdAt',
  'lastLoginAt',
  'email',
] as const satisfies readonly UserSort[];

const SORT_ORDERS = ['asc', 'desc'] as const satisfies readonly SortOrder[];

export function useSuperAdminUsers() {
  const toast = useToast();
  const confirmModal = useConfirmModal();
  const { t } = useI18n();
  const { loadStats } = useSuperAdminStats();

  const list = usePaginatedList<
    SuperAdminUser,
    {
      search: string;
      status: UserStatusFilter;
      sort: UserSort;
      order: SortOrder;
    }
  >({
    endpoint: '/admin/users',
    defaults: { search: '', status: 'all', sort: 'createdAt', order: 'desc' },
    allowed: {
      status: USER_STATUS_FILTERS,
      sort: USER_SORTS,
      order: SORT_ORDERS,
    },
    ascendingSorts: ['email'],
    onError: () => toast.error(t('admin.users.errors.load')),
  });

  async function toggleBan(user: SuperAdminUser) {
    if (user.isSuperadmin) return;

    const action = user.isBanned ? 'unban' : 'ban';
    const confirmed = await confirmModal.ask({
      title: t(`admin.users.${action}_modal.title`),
      content: t(`admin.users.${action}_modal.content`, { email: user.email }),
      submitText: t(`admin.users.actions.${action}`),
      danger: !user.isBanned,
    });
    if (!confirmed) return;

    try {
      if (user.isBanned) {
        await hw.delete(`/admin/users/${user.id}/ban`);
      } else {
        await hw.post(`/admin/users/${user.id}/ban`);
      }
      user.isBanned = !user.isBanned;
      toast.success(t(`admin.users.${action}_success`));
      await loadStats();
    } catch {
      toast.error(t('admin.errors.action_failed'));
    }
  }

  async function deleteUser(user: SuperAdminUser) {
    const confirmed = await confirmModal.ask({
      title: t('admin.users.delete_modal.title'),
      content: t('admin.users.delete_modal.content', { email: user.email }),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!confirmed) return;

    try {
      await hw.delete(`/admin/users/${user.id}`);
      toast.success(t('admin.users.delete_success'));
      await Promise.all([list.reload(), loadStats()]);
    } catch {
      toast.error(t('admin.users.errors.delete'));
    }
  }

  return { ...list, toggleBan, deleteUser };
}
