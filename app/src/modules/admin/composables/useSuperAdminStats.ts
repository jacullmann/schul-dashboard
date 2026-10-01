import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import type { DailyActivity, SuperAdminStats } from '../types';

// Shared across the dashboard shell (nav badge) and the overview page, so
// the stats are fetched once per visit and refreshed only after changes.
const stats = ref<SuperAdminStats | null>(null);
const dailyActivity = ref<DailyActivity[]>([]);
const loadingStats = ref(false);

export function useSuperAdminStats() {
  const toast = useToast();
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

  return {
    stats,
    dailyActivity,
    loadingStats,
    loadStats,
    loadDailyActivity,
  };
}
