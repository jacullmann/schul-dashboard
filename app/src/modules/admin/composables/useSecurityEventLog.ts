import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import axios from 'axios';
import api from '@/api/api';
import { isUuid } from '@/utils/uuid';
import type {
  SecurityEvent,
  SecurityEventFilters,
  SecurityEventOutcome,
} from '../types';

const OUTCOMES = [
  'success',
  'failure',
] as const satisfies readonly SecurityEventOutcome[];

/** Loose enough for IPv4 and IPv6; the server parses the address for real. */
const IP_PATTERN = /^[0-9a-f.:]+$/i;

function isOutcome(value: string | undefined): value is SecurityEventOutcome {
  return OUTCOMES.some((outcome) => outcome === value);
}

/**
 * The newest entries of the security log that match the filters in the URL
 * query, so a filtered view can be linked to, reloaded and stepped back from.
 */
export function useSecurityEventLog() {
  const route = useRoute();
  const router = useRouter();
  const routeName = route.name;

  const filters = computed<SecurityEventFilters>(() => {
    const text = (key: keyof SecurityEventFilters) => {
      const raw = route.query[key];
      return typeof raw === 'string' && raw ? raw : undefined;
    };
    const outcome = text('outcome');
    const ip = text('ip');
    const userId = text('userId');

    return {
      eventType: text('eventType'),
      outcome: isOutcome(outcome) ? outcome : undefined,
      ip: ip && IP_PATTERN.test(ip) ? ip : undefined,
      userId: isUuid(userId) ? userId : undefined,
    };
  });

  const hasFilters = computed(() =>
    Object.values(filters.value).some((value) => value !== undefined),
  );

  const events = ref<SecurityEvent[]>([]);
  const loading = ref(false);
  const failed = ref(false);

  function setFilters(patch: Partial<SecurityEventFilters>) {
    const query: LocationQueryRaw = { ...filters.value, ...patch };
    return router.push({ name: routeName ?? undefined, query });
  }

  function clearFilters() {
    return router.push({ name: routeName ?? undefined });
  }

  let controller: AbortController | null = null;

  async function load() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    loading.value = true;
    failed.value = false;

    try {
      const { data } = await api.get<SecurityEvent[]>(
        '/admin/security-events',
        { params: filters.value, signal: current.signal },
      );
      events.value = data;
    } catch (error) {
      if (!axios.isCancel(error)) failed.value = true;
    } finally {
      if (controller === current) loading.value = false;
    }
  }

  // Keyed on the serialized filters so leaving the page or re-navigating to
  // the same query never triggers a redundant request.
  watch(
    () => (route.name === routeName ? JSON.stringify(filters.value) : null),
    (key) => {
      if (key !== null) void load();
    },
    { immediate: true },
  );

  return {
    events,
    loading,
    failed,
    filters,
    hasFilters,
    setFilters,
    clearFilters,
    reload: load,
  };
}
