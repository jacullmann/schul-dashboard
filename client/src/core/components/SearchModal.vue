<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth.ts';
import { useItemForm } from '@/core/composables/useItemForm';
import {
  House,
  ListTodo,
  CalendarDays,
  UsersRound,
  Brain,
  Gamepad2,
  CirclePlus,
  LogIn,
  UserPlus,
  Search,
  ChevronRight,
  ArrowUpRight,
} from '@lucide/vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const router = useRouter();
const { activeGroupId } = useAppAuth();
const { openItemForm } = useItemForm();

const query = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const selectedIndex = ref(0);

type ResultCategory = 'page' | 'action';

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  category: ResultCategory;
  icon: any;
  action: () => void;
  shortcut?: string;
}

// Define all searchable items
const allResults = computed<SearchResult[]>(() => [
  // Pages
  {
    id: 'home',
    label: t('sidebar.home'),
    description: t('search.descriptions.home'),
    category: 'page',
    icon: House,
    action: () => navigate('/home'),
  },
  {
    id: 'tasks',
    label: t('sidebar.tasks'),
    description: t('search.descriptions.tasks'),
    category: 'page',
    icon: ListTodo,
    action: () => navigate(`/groups/${activeGroupId.value}/items/all`),
  },
  {
    id: 'schedule',
    label: t('sidebar.schedule'),
    description: t('search.descriptions.schedule'),
    category: 'page',
    icon: CalendarDays,
    action: () => navigate(`/groups/${activeGroupId.value}/schedule`),
  },
  {
    id: 'groups',
    label: t('sidebar.groups'),
    description: t('search.descriptions.groups'),
    category: 'page',
    icon: UsersRound,
    action: () => navigate('/home'),
  },
  {
    id: 'brain',
    label: t('search.items.brainTests'),
    description: t('search.descriptions.brainTests'),
    category: 'page',
    icon: Brain,
    action: () => navigate('/brain'),
  },
  {
    id: 'games',
    label: t('search.items.games'),
    description: t('search.descriptions.games'),
    category: 'page',
    icon: Gamepad2,
    action: () => navigate('/games'),
  },
  // Actions
  {
    id: 'create-entry',
    label: t('search.items.createEntry'),
    description: t('search.descriptions.createEntry'),
    category: 'action',
    icon: CirclePlus,
    action: () => { openItemForm(); emit('cancel'); },
    shortcut: 'N',
  },
  {
    id: 'join-group',
    label: t('search.items.joinGroup'),
    description: t('search.descriptions.joinGroup'),
    category: 'action',
    icon: LogIn,
    action: () => navigate('/home'),
  },
  {
    id: 'create-group',
    label: t('search.items.createGroup'),
    description: t('search.descriptions.createGroup'),
    category: 'action',
    icon: UserPlus,
    action: () => navigate('/home'),
  },
]);

// Fuzzy-ish filtering: match every character of query in order within label/description
function matchesQuery(item: SearchResult, q: string): boolean {
  if (!q) return true;
  const haystack = `${item.label} ${item.description ?? ''}`.toLowerCase();
  const needle = q.toLowerCase();
  let hi = 0;
  for (const ch of needle) {
    hi = haystack.indexOf(ch, hi);
    if (hi === -1) return false;
    hi++;
  }
  return true;
}

const filteredResults = computed(() =>
  allResults.value.filter((item) => matchesQuery(item, query.value)),
);

const pageResults = computed(() =>
  filteredResults.value.filter((r) => r.category === 'page'),
);
const actionResults = computed(() =>
  filteredResults.value.filter((r) => r.category === 'action'),
);

// Keep selected index in bounds
watch(filteredResults, () => {
  selectedIndex.value = 0;
});

function navigate(path: string) {
  router.push(path);
  emit('cancel');
}

function selectIndex(idx: number) {
  selectedIndex.value = idx;
}

function activateSelected() {
  filteredResults.value[selectedIndex.value]?.action();
}

function handleKeydown(e: KeyboardEvent) {
  const len = filteredResults.value.length;
  if (!len) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % len;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + len) % len;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    activateSelected();
  }
}

// Global index across categories for keyboard nav
function globalIndex(item: SearchResult): number {
  return filteredResults.value.indexOf(item);
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 50);
});
</script>

<template>
  <!-- Backdrop -->
  <div
    class="blurit"
    @click.self="$emit('cancel')"
    aria-hidden="true"
    style="z-index: 100002;"
  >
    <!-- Modal panel -->
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="t('search.modal.title')"
      class="search-modal bg-surface border border-surface-border rounded-2xl w-[calc(100%-32px)] max-w-[560px] overflow-hidden fixed text-left"
      style="z-index: 100003; top: 50%; left: 50%; transform: translate(-50%, -50%);"
      @keydown="handleKeydown"
    >
      <!-- Search input -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
        <Search :size="18" class="text-on-surface-subtle shrink-0" />
        <input
          id="search-modal-input"
          ref="inputRef"
          v-model="query"
          type="text"
          :placeholder="t('search.modal.placeholder')"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 bg-transparent border-none outline-none text-on-surface text-body placeholder:text-on-surface-subtle"
        />
        <BaseKbd class="hidden sm:inline-flex">Esc</BaseKbd>
      </div>

      <!-- Results -->
      <div class="max-h-[420px] overflow-y-auto py-2">
        <!-- Pages section -->
        <template v-if="pageResults.length">
          <div class="px-4 py-1.5">
            <span class="text-footnote text-on-surface-muted font-semibold uppercase tracking-wider">
              {{ t('search.modal.categoryPages') }}
            </span>
          </div>
          <button
            v-for="item in pageResults"
            :key="item.id"
            class="search-result-item w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none bg-transparent text-left transition-colors"
            :class="selectedIndex === globalIndex(item) ? 'bg-surface-hover' : 'hover:bg-surface-hover-subtle'"
            @click="item.action()"
            @mouseenter="selectIndex(globalIndex(item))"
          >
            <span
              class="shrink-0 flex items-center justify-center w-8 h-8 text-on-surface-muted"
            >
              <component :is="item.icon" :size="20" />
            </span>

            <span class="flex-1 min-w-0">
              <span class="block text-sub font-medium text-on-surface leading-tight">{{ item.label }}</span>
              <span
                v-if="item.description"
                class="block text-footnote text-on-surface-muted truncate mt-0.5"
              >{{ item.description }}</span>
            </span>

            <ArrowUpRight
              v-if="selectedIndex === globalIndex(item)"
              :size="14"
              class="shrink-0 text-on-surface-subtle"
            />
          </button>
        </template>

        <!-- Actions section -->
        <template v-if="actionResults.length">
          <div class="px-4 py-1.5" :class="pageResults.length ? 'mt-2' : ''">
            <span class="text-footnote text-on-surface-muted font-semibold uppercase tracking-wider">
              {{ t('search.modal.categoryActions') }}
            </span>
          </div>
          <button
            v-for="item in actionResults"
            :key="item.id"
            class="search-result-item w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none bg-transparent text-left transition-colors"
            :class="selectedIndex === globalIndex(item) ? 'bg-surface-hover' : 'hover:bg-surface-hover-subtle'"
            @click="item.action()"
            @mouseenter="selectIndex(globalIndex(item))"
          >
            <span
              class="shrink-0 flex items-center justify-center w-8 h-8 text-on-surface-muted"
            >
              <component :is="item.icon" :size="20" />
            </span>

            <span class="flex-1 min-w-0">
              <span class="block text-sub font-medium text-on-surface leading-tight">{{ item.label }}</span>
              <span
                v-if="item.description"
                class="block text-footnote text-on-surface-muted truncate mt-0.5"
              >{{ item.description }}</span>
            </span>

            <span class="flex items-center gap-2 shrink-0">
              <BaseKbd
                v-if="item.shortcut && selectedIndex === globalIndex(item)"
              >
                {{ item.shortcut }}
              </BaseKbd>
              <ChevronRight
                v-if="selectedIndex === globalIndex(item)"
                :size="14"
                class="text-on-surface-subtle"
              />
            </span>
          </button>
        </template>

        <!-- Empty state -->
        <div
          v-if="!filteredResults.length"
          class="px-4 py-10 flex flex-col items-center gap-2 text-center"
        >
          <Search :size="28" class="text-on-surface-subtle mb-1" />
          <p class="text-sub text-on-surface-muted m-0">
            {{ t('global.search.noResults') }} <strong class="text-on-surface">„{{ query }}"</strong>
          </p>
        </div>
      </div>

      <!-- Footer hint -->
      <div class="px-4 py-2.5 border-t border-surface-border flex items-center gap-4 text-footnote text-on-surface-muted">
        <span class="flex items-center gap-1">
          <BaseKbd>↑</BaseKbd>
          <BaseKbd>↓</BaseKbd>
          {{ t('search.modal.hintNavigate') }}
        </span>
        <span class="flex items-center gap-1">
          <BaseKbd>↵</BaseKbd>
          {{ t('search.modal.hintConfirm') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-modal {
  /* Smooth appear animation */
  animation: search-in 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes search-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 8px)) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Custom scrollbar */
.max-h-\[420px\]::-webkit-scrollbar {
  width: 4px;
}

.max-h-\[420px\]::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-\[420px\]::-webkit-scrollbar-thumb {
  background: var(--color-surface-border);
  border-radius: 999px;
}
</style>
