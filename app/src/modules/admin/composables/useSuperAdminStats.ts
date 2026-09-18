import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import type { SuperAdminStats } from '../types';

const stats = ref<SuperAdminStats | null>(null);
const loadingStats = ref(false);
const isCleaningUp = ref(false);

export function useSuperAdminStats() {
  const toast = useToast();
  const modalStore = useModalStore();
  const { t } = useI18n();

  async function loadStats() {
    loadingStats.value = true;
    try {
      const { data } = await hw.get('/admin/stats');
      stats.value = data;
    } catch (e) {
      console.error(e);
    } finally {
      loadingStats.value = false;
    }
  }

  async function cleanupOldItems() {
    const confirmed = await modalStore.confirm({
      title: t('admin.overview.cleanup.modal.title'),
      content: t('admin.overview.cleanup.modal.content'),
      submitText: t('common.buttons.confirm'),
      danger: true,
    });
    if (!confirmed) return;

    isCleaningUp.value = true;
    try {
      const { data } = await hw.delete('/admin/cleanup/old-items');
      toast.success(data.message || t('admin.overview.cleanup.success'));
      await loadStats();
    } catch {
      toast.error(t('admin.overview.cleanup.error'));
    } finally {
      isCleaningUp.value = false;
    }
  }

  return { stats, loadingStats, isCleaningUp, loadStats, cleanupOldItems };
}
