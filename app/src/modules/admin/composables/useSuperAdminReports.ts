import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import type { SuperAdminReport } from '../types';
import { useSuperAdminStats } from './useSuperAdminStats';

const reports = ref<SuperAdminReport[]>([]);
const loadingReports = ref(false);

const unprocessedReports = computed(() =>
  reports.value.filter((r) => !r.processed),
);
const processedReports = computed(() =>
  reports.value.filter((r) => r.processed),
);

export function useSuperAdminReports() {
  const toast = useToast();
  const modalStore = useModalStore();
  const { t } = useI18n();
  const { loadStats } = useSuperAdminStats();

  async function loadReports() {
    loadingReports.value = true;
    try {
      const { data } = await hw.get('/admin/reports');
      reports.value = data;
    } catch {
      toast.error(t('admin.reports.errors.load'));
    } finally {
      loadingReports.value = false;
    }
  }

  async function toggleReportProcessed(id: string, currentProcessed: boolean) {
    try {
      await hw.patch(`/admin/reports/${id}/processed`, {
        processed: !currentProcessed,
      });
      const r = reports.value.find((x) => x.id === id);
      if (r) {
        r.processed = !currentProcessed;
        r.processedAt = !currentProcessed ? new Date().toISOString() : null;
      }
      toast.success(
        !currentProcessed
          ? t('admin.reports.resolved_success')
          : t('admin.reports.reopened_success'),
      );
      await loadStats();
    } catch {
      toast.error(t('admin.errors.action_failed'));
    }
  }

  async function deleteReport(id: string) {
    const confirmed = await modalStore.confirm({
      title: t('admin.reports.delete_modal.title'),
      content: t('admin.reports.delete_modal.content'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/reports/${id}`);
      reports.value = reports.value.filter((r) => r.id !== id);
      toast.success(t('admin.reports.delete_success'));
      await loadStats();
    } catch {
      toast.error(t('admin.reports.errors.delete'));
    }
  }

  return {
    reports,
    loadingReports,
    unprocessedReports,
    processedReports,
    loadReports,
    toggleReportProcessed,
    deleteReport,
  };
}
