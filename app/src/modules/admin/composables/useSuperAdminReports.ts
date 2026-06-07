import { ref, computed } from 'vue';
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
  const { loadStats } = useSuperAdminStats();

  async function loadReports() {
    loadingReports.value = true;
    try {
      const { data } = await hw.get('/admin/reports');
      reports.value = data;
    } catch {
      toast.error('Failed to load reports.');
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
      toast.success(!currentProcessed ? 'Marked as resolved.' : 'Reopened.');
      await loadStats();
    } catch {
      toast.error('Action failed.');
    }
  }

  async function deleteReport(id: string) {
    const confirmed = await modalStore.confirm({
      title: 'Delete Report?',
      content: 'Are you sure you want to delete this report?',
      submitText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/reports/${id}`);
      reports.value = reports.value.filter((r) => r.id !== id);
      toast.success('Report deleted.');
      await loadStats();
    } catch {
      toast.error('Failed to delete report.');
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
