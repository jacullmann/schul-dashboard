<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useItemForm } from '@/core/composables/useItemForm';
import {
  House,
  ListTodo,
  CalendarDays,
  Lock,
  UsersRound,
  Brain,
  Gamepad2,
  CirclePlus,
  LogIn,
  UserRoundPlus,
  Search,
  ChevronRight,
  ArrowUpRight,
  LucideGraduationCap,
  LucideKeyRound,
  ShieldCheck,
  LogOut,
  PanelLeft,
} from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';
import { useAccountModals } from '@/modules/auth/composables/useAccountModals';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/hwApi';
import BaseCommandPalette from '@/common/components/BaseCommandPalette.vue';
import BaseCommandPaletteItem from '@/common/components/BaseCommandPaletteItem.vue';
import BaseKbdGroup from '@/common/components/BaseKbdGroup.vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const router = useRouter();
const { activeGroupId, logout: appAuthLogout } = useAppAuth();
const { openItemForm } = useItemForm();
const { openSetup, openSecurity, openChangePassword } = useAccountModals();
const userStore = useUserStore();
const { resetMfaState } = useMfa();
const modalStore = useModalStore();

const query = ref('');

type ResultCategory = 'page' | 'action';

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  category: ResultCategory;
  icon: any;
  action: () => void;
  shortcut?: string[];
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
    id: 'private',
    label: t('sidebar.private'),
    description: t('search.descriptions.private'),
    category: 'page',
    icon: Lock,
    action: () => navigate('/todos'),
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
  {
    id: 'toggle-sidebar',
    label: t('sidebar.toggle'),
    description: t('search.descriptions.toggleSidebar'),
    category: 'action',
    icon: PanelLeft,
    action: () => {
      modalStore.toggleSidebar();
      emit('cancel');
    },
    shortcut: ['ctrl', 'shift', 'd'],
  },
  // Actions
  {
    id: 'create-entry',
    label: t('search.items.createEntry'),
    description: t('search.descriptions.createEntry'),
    category: 'action',
    icon: CirclePlus,
    action: () => {
      openItemForm();
      emit('cancel');
    },
    shortcut: ['alt', 'n'],
  },
  {
    id: 'switch-group',
    label: t('search.items.switchGroup'),
    description: t('search.descriptions.switchGroup'),
    category: 'action',
    icon: UsersRound,
    action: () => {
      modalStore.openGroupSwitch();
      emit('cancel');
    },
    shortcut: ['ctrl', 'g'],
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
    icon: UserRoundPlus,
    action: () => navigate('/home'),
  },
  // Account Actions
  {
    id: 'edit-courses',
    label: t('account.menu.courses.title'),
    description: t('search.descriptions.editCourses'),
    category: 'action',
    icon: LucideGraduationCap,
    action: () => {
      openSetup();
      emit('cancel');
    },
  },
  {
    id: 'security',
    label: t('account.menu.security.title'),
    description: t('search.descriptions.security'),
    category: 'action',
    icon: ShieldCheck,
    action: () => {
      openSecurity();
      emit('cancel');
    },
  },
  {
    id: 'change-password',
    label: t('account.menu.changePassword.title'),
    description: t('search.descriptions.changePassword'),
    category: 'action',
    icon: LucideKeyRound,
    action: () => {
      openChangePassword();
      emit('cancel');
    },
  },
  {
    id: 'logout',
    label: t('account.menu.logout'),
    description: t('search.descriptions.logout'),
    category: 'action',
    icon: LogOut,
    action: logout,
  },
]);

async function logout() {
  emit('cancel');
  try {
    await hw.post('/api/auth/logout');
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    userStore.clearUser();
    resetMfaState();
    await appAuthLogout();
    router.push('/');
  }
}

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

function navigate(path: string) {
  router.push(path);
  emit('cancel');
}

function handleSelect(index: number) {
  filteredResults.value[index]?.action();
}

function globalIndex(item: SearchResult): number {
  return filteredResults.value.indexOf(item);
}
</script>

<template>
  <BaseCommandPalette
    v-model="query"
    :item-count="filteredResults.length"
    :placeholder="t('search.modal.placeholder')"
    :title="t('search.modal.title')"
    :icon="Search"
    id-prefix="search-result-"
    @select="handleSelect"
    @cancel="$emit('cancel')"
  >
    <template #default="{ selectedIndex, setSelectedIndex }">
      <!-- Pages section -->
      <template v-if="pageResults.length">
        <div class="px-4 py-1.5">
          <span
            class="text-footnote text-on-surface-muted font-semibold uppercase tracking-wider"
          >
            {{ t('search.modal.categoryPages') }}
          </span>
        </div>
        <BaseCommandPaletteItem
          v-for="item in pageResults"
          :key="item.id"
          :id="'search-result-' + globalIndex(item)"
          :active="selectedIndex === globalIndex(item)"
          :label="item.label"
          :description="item.description"
          :icon="item.icon"
          @click="item.action()"
          @mouseenter="setSelectedIndex(globalIndex(item))"
        >
          <ArrowUpRight
            v-if="selectedIndex === globalIndex(item)"
            :size="14"
            class="shrink-0 text-on-surface-subtle"
          />
        </BaseCommandPaletteItem>
      </template>

      <!-- Actions section -->
      <template v-if="actionResults.length">
        <div class="px-4 py-1.5" :class="pageResults.length ? 'mt-2' : ''">
          <span
            class="text-footnote text-on-surface-muted font-semibold uppercase tracking-wider"
          >
            {{ t('search.modal.categoryActions') }}
          </span>
        </div>
        <BaseCommandPaletteItem
          v-for="item in actionResults"
          :key="item.id"
          :id="'search-result-' + globalIndex(item)"
          :active="selectedIndex === globalIndex(item)"
          :label="item.label"
          :description="item.description"
          :icon="item.icon"
          @click="item.action()"
          @mouseenter="setSelectedIndex(globalIndex(item))"
        >
          <span class="flex items-center gap-2 shrink-0">
            <BaseKbdGroup
              v-if="item.shortcut && selectedIndex === globalIndex(item)"
              :keys="item.shortcut"
            />
            <ChevronRight
              v-if="selectedIndex === globalIndex(item)"
              :size="14"
              class="text-on-surface-subtle"
            />
          </span>
        </BaseCommandPaletteItem>
      </template>

      <!-- Empty state -->
      <div
        v-if="!filteredResults.length"
        class="px-4 py-10 flex flex-col items-center gap-2 text-center"
      >
        <Search :size="28" class="text-on-surface-subtle mb-1" />
        <p class="text-sub text-on-surface-muted m-0">
          {{ t('global.search.noResults') }}
          <strong class="text-on-surface">„{{ query }}"</strong>
        </p>
      </div>
    </template>
  </BaseCommandPalette>
</template>
