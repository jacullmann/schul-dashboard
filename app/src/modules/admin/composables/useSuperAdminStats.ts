import { ref } from 'vue';
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
      title: 'Cleanup?',
      content: 'Delete all entries older than 90 days?',
      submitText: 'Confirm',
      danger: true,
    });
    if (!confirmed) return;

    isCleaningUp.value = true;
    try {
      const { data } = await hw.delete('/admin/cleanup/old-items');
      toast.success(data.message || 'Cleanup complete.');
      await loadStats();
    } catch {
      toast.error('Cleanup failed.');
    } finally {
      isCleaningUp.value = false;
    }
  }

  return { stats, loadingStats, isCleaningUp, loadStats, cleanupOldItems };
}
