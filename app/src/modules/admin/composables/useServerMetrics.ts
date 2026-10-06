import axios from 'axios';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api/api';
import type { MetricsRange, ServerMetrics } from '../types';

export const METRICS_RANGES: readonly MetricsRange[] = [
  '1h',
  '24h',
  '7d',
  '30d',
];
const DEFAULT_RANGE: MetricsRange = '24h';

export function isMetricsRange(value: unknown): value is MetricsRange {
  return METRICS_RANGES.includes(value as MetricsRange);
}

/**
 * The server's load as Hetzner measures it, over a window kept in the URL
 * query so a view survives reloads and can be linked. `unavailable` marks a
 * deployment without Hetzner credentials, where the metrics are left out.
 */
export function useServerMetrics() {
  const route = useRoute();
  const router = useRouter();
  const routeName = route.name;

  const range = computed<MetricsRange>(() =>
    isMetricsRange(route.query.range) ? route.query.range : DEFAULT_RANGE,
  );

  const metrics = ref<ServerMetrics | null>(null);
  const loading = ref(false);
  const failed = ref(false);
  const unavailable = ref(false);

  function setRange(next: MetricsRange) {
    return router.replace({
      name: routeName ?? undefined,
      query: {
        ...route.query,
        range: next === DEFAULT_RANGE ? undefined : next,
      },
    });
  }

  let controller: AbortController | null = null;

  async function load() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    loading.value = true;
    failed.value = false;

    try {
      const { data } = await api.get<ServerMetrics>('/admin/server-metrics', {
        params: { range: range.value },
        signal: current.signal,
      });
      metrics.value = data;
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        unavailable.value = true;
      } else {
        failed.value = true;
      }
    } finally {
      if (controller === current) loading.value = false;
    }
  }

  // Leaving the page drops the query, which must not refetch the default range.
  watch(
    () => (route.name === routeName ? range.value : null),
    (current) => {
      if (current !== null) void load();
    },
    { immediate: true },
  );

  onScopeDispose(() => controller?.abort());

  return { range, metrics, loading, failed, unavailable, setRange, load };
}
