import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import type { SecurityEvent } from '../types';

/** The newest entries of the security log, fetched whenever the overview opens. */
export function useSecurityEvents() {
  const { t } = useI18n();
  const toast = useToast();
  const events = ref<SecurityEvent[]>([]);
  const loading = ref(false);
  const failed = ref(false);

  async function loadEvents() {
    loading.value = true;
    failed.value = false;
    try {
      const { data } = await api.get<SecurityEvent[]>('/admin/security-events');
      events.value = data;
    } catch {
      failed.value = true;
      toast.error(t('admin.overview.security_events.error'));
    } finally {
      loading.value = false;
    }
  }

  return { events, loading, failed, loadEvents };
}
