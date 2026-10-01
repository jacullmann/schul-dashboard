import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import type { DailyActivity, SuperAdminStats } from '../types';

type CleanupTarget = 'old-items' | 'old-activity' | 'unverifiable-users';

export const CLEANUP_I18N_KEYS: Record<CleanupTarget, string> = {
  'old-items': 'admin.overview.cleanup.items',
  'old-activity': 'admin.overview.cleanup.activity',
  'unverifiable-users': 'admin.overview.cleanup.unverifiable_users',
};

// Shared across the dashboard shell (nav badge) and the overview page, so
// the stats are fetched once per visit and refreshed only after changes.
const stats = ref<SuperAdminStats | null>(null);
const dailyActivity = ref<DailyActivity[]>([]);
const loadingStats = ref(false);
const cleaningUp = ref<CleanupTarget | null>(null);

export function useSuperAdminStats() {
  const toast = useToast();
  const modalStore = useModalStore();
  const { t } = useI18n();

  async function loadStats() {
    loadingStats.value = true;
    try {
      const { data } = await hw.get<SuperAdminStats>('/admin/stats');
      stats.value = data;
    } catch {
      toast.error(t('admin.overview.errors.load'));
    } finally {
      loadingStats.value = false;
    }
  }

  async function loadDailyActivity() {
    try {
      const { data } = await hw.get<DailyActivity[]>('/admin/stats/daily');
      dailyActivity.value = data;
    } catch {
      toast.error(t('admin.overview.errors.load'));
    }
  }

  async function cleanup(target: CleanupTarget) {
    const i18nKey = CLEANUP_I18N_KEYS[target];

    const confirmed = await modalStore.confirm({
      title: t(`${i18nKey}.modal_title`),
      content: t(`${i18nKey}.modal_content`),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!confirmed) return;

    cleaningUp.value = target;
    try {
      const { data } = await hw.delete<{ deletedCount: number }>(
        `/admin/cleanup/${target}`,
      );
      toast.success(
        t('admin.overview.cleanup.success', { count: data.deletedCount }),
      );
      await loadStats();
    } catch {
      toast.error(t('admin.overview.cleanup.error'));
    } finally {
      cleaningUp.value = null;
    }
  }

  return {
    stats,
    dailyActivity,
    loadingStats,
    cleaningUp,
    loadStats,
    loadDailyActivity,
    cleanup,
  };
}
