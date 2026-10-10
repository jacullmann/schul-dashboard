import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import type { SecurityEventSummary } from '../types';

/** The security log of the past week at a glance, fetched whenever the overview opens. */
export function useSecurityEventSummary() {
  const { t } = useI18n();
  const toast = useToast();
  const summary = ref<SecurityEventSummary | null>(null);
  const loading = ref(false);
  const failed = ref(false);

  async function loadSummary() {
    loading.value = true;
    failed.value = false;
    try {
      const { data } = await api.get<SecurityEventSummary>(
        '/admin/security-events/summary',
      );
      summary.value = data;
    } catch {
      failed.value = true;
      toast.error(t('admin.security.error'));
    } finally {
      loading.value = false;
    }
  }

  return { summary, loading, failed, loadSummary };
}
