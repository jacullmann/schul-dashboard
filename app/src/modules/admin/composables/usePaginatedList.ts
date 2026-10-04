import { computed, ref, watch, type Ref } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { watchDebounced } from '@vueuse/core';
import axios from 'axios';
import api from '@/api/api';
import type { Page, SortOrder } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

type ListParams = { search: string; sort: string; order: SortOrder } & Record<
  string,
  string
>;

export interface PaginatedListOptions<TParams extends ListParams> {
  endpoint: string;
  /** Every URL parameter besides `page`; values equal to their default stay out of the URL. */
  defaults: TParams;
  /** Accepted values per parameter; anything else in the URL falls back to the default. */
  allowed?: { [K in keyof TParams]?: readonly TParams[K][] };
  /** Sorts that start ascending when first picked, such as names. */
  ascendingSorts?: readonly TParams['sort'][];
  onError: () => void;
}

/**
 * A server-side paginated, searchable and sortable list whose whole state
 * lives in the URL query, so every view can be linked, reloaded and navigated
 * with the browser history.
 */
export function usePaginatedList<TItem, TParams extends ListParams>(
  options: PaginatedListOptions<TParams>,
) {
  const route = useRoute();
  const router = useRouter();
  const routeName = route.name;

  const params = computed<TParams>(() => {
    const result = { ...options.defaults };
    for (const key of Object.keys(options.defaults) as (keyof TParams)[]) {
      const raw = route.query[key as string];
      if (typeof raw !== 'string') continue;
      const allowed = options.allowed?.[key];
      if (!allowed || allowed.includes(raw as TParams[typeof key])) {
        result[key] = raw as TParams[typeof key];
      }
    }
    return result;
  });

  const page = computed(() => {
    const parsed = Number(route.query.page);
    return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
  });

  const data = ref<Page<TItem> | null>(null) as Ref<Page<TItem> | null>;
  const loading = ref(false);
  const items = computed(() => data.value?.items ?? []);
  const total = computed(() => data.value?.total ?? 0);
  const pageCount = computed(() => data.value?.pageCount ?? 0);

  function navigate(next: TParams, nextPage: number, replace: boolean) {
    const query: LocationQueryRaw = {};
    for (const key of Object.keys(next) as (keyof TParams & string)[]) {
      if (next[key] !== options.defaults[key]) query[key] = next[key];
    }
    if (nextPage > 1) query.page = String(nextPage);

    const location = { name: routeName ?? undefined, query };
    return replace ? router.replace(location) : router.push(location);
  }

  function setParams(patch: Partial<TParams>, replace = false) {
    return navigate({ ...params.value, ...patch }, 1, replace);
  }

  function setPage(nextPage: number) {
    return navigate(params.value, nextPage, false);
  }

  function toggleSort(sort: TParams['sort']) {
    if (params.value.sort === sort) {
      const order: SortOrder = params.value.order === 'asc' ? 'desc' : 'asc';
      return setParams({ order } as Partial<TParams>);
    }
    const order: SortOrder = options.ascendingSorts?.includes(sort)
      ? 'asc'
      : 'desc';
    return setParams({ sort, order } as Partial<TParams>);
  }

  let controller: AbortController | null = null;

  async function load() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    loading.value = true;

    try {
      const { data: result } = await api.get<Page<TItem>>(options.endpoint, {
        params: { ...params.value, page: page.value },
        signal: current.signal,
      });
      data.value = result;

      if (result.pageCount > 0 && page.value > result.pageCount) {
        await navigate(params.value, result.pageCount, true);
      }
    } catch (error) {
      if (!axios.isCancel(error)) options.onError();
    } finally {
      if (controller === current) loading.value = false;
    }
  }

  // Keyed on the serialized state so leaving the page or re-navigating to the
  // same query never triggers a redundant request.
  watch(
    () =>
      route.name === routeName
        ? JSON.stringify([params.value, page.value])
        : null,
    (key) => {
      if (key !== null) void load();
    },
    { immediate: true },
  );

  const searchInput = ref(params.value.search);

  watch(
    () => params.value.search,
    (search) => {
      if (searchInput.value.trim() !== search) searchInput.value = search;
    },
  );

  watchDebounced(
    searchInput,
    (input) => {
      const search = input.trim();
      if (search !== params.value.search) {
        void setParams({ search } as Partial<TParams>, true);
      }
    },
    { debounce: SEARCH_DEBOUNCE_MS },
  );

  return {
    params,
    page,
    items,
    total,
    pageCount,
    loading,
    searchInput,
    setParams,
    setPage,
    toggleSort,
    reload: load,
  };
}
