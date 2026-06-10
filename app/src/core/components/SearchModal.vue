<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useItemForm } from '@/core/composables/useItemForm';
import { usePrivateTaskForm } from '@/core/composables/usePrivateTaskForm';
import { useAnnouncementForm } from '@/core/composables/useAnnouncementForm';
import {
  House,
  ListTodo,
  CalendarDays,
  MessageCircle,
  Lock,
  Megaphone,
  UsersRound,
  Settings,
  Gamepad,
  Newspaper,
  Crop,
  SquarePen,
  LogIn,
  UserRoundPlus,
  Plus,
  Search,
  ChevronRight,
  ArrowUpRight,
  LucideGraduationCap,
  SunMoon,
  Languages,
  LucideKeyRound,
  Shield,
  LogOut,
  PanelLeft,
  Moon,
  Sun,
  Check,
  ArrowLeft,
} from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';
import { useAccountModals } from '@/modules/auth/composables/useAccountModals';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useUserStore } from '@/stores/userStore';
import { usePreferences } from '@/common/composables/usePreferences';
import hw from '../../api/api';
import { useGroupAction } from '@/core/composables/useGroupAction';
import Avatar from '@/modules/auth/components/Avatar.vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const {
  activeGroupId,
  userGroups,
  switchActiveGroup,
  logout: appAuthLogout,
  checkPermission,
  createInvite,
} = useAppAuth();
const { openItemForm } = useItemForm();
const { openPrivateTaskForm } = usePrivateTaskForm();
const { openAnnouncementForm } = useAnnouncementForm();
const { openSetup, openSecurity, openChangePassword } = useAccountModals();
const userStore = useUserStore();
const { resetMfaState } = useMfa();
const modalStore = useModalStore();
const { currentTheme, currentLanguage, setPreference } = usePreferences();
const { withGroup } = useGroupAction();

const isAnyGroupAdmin = computed(() => {
  if (userStore.isSuperadmin) return true;
  if (userStore.isGroupAdmin) return true;
  return userGroups.value?.some(
    (g) => g.role === 'admin' || g.role === 'moderator',
  );
});

const query = ref('');

const mode = computed(() => modalStore.searchMode);

function setMode(newMode: 'default' | 'group' | 'theme' | 'language') {
  query.value = '';
  modalStore.searchMode = newMode;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Backspace' && query.value === '' && mode.value !== 'default') {
    setMode('default');
    e.preventDefault();
  }
}

type ResultCategory = 'page' | 'action';

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  category: ResultCategory;
  icon: any;
  action: () => void;
  shortcut?: string[];
  condition?: boolean;
}

const defaultResults = computed<SearchResult[]>(() => [
  {
    id: 'dashboard',
    label: t('common.sidebar.dashboard'),
    description: t('search.descriptions.home'),
    category: 'page',
    icon: House,
    action: () =>
      withGroup(() => navigate(`/groups/${activeGroupId.value}/dashboard`)),
  },
  {
    id: 'tasks',
    label: t('common.sidebar.tasks'),
    description: t('search.descriptions.tasks'),
    category: 'page',
    icon: ListTodo,
    action: () =>
      withGroup(() => navigate(`/groups/${activeGroupId.value}/tasks`)),
  },
  {
    id: 'schedule',
    label: t('common.sidebar.schedule'),
    description: t('search.descriptions.schedule'),
    category: 'page',
    icon: CalendarDays,
    action: () =>
      withGroup(() => navigate(`/groups/${activeGroupId.value}/schedule`)),
  },
  {
    id: 'messages',
    label: t('common.sidebar.messages'),
    description: t('search.descriptions.messages'),
    category: 'page',
    icon: MessageCircle,
    action: () =>
      withGroup(() => navigate(`/groups/${activeGroupId.value}/messages`)),
  },
  {
    id: 'private',
    label: t('common.sidebar.private'),
    description: t('search.descriptions.private'),
    category: 'page',
    icon: Lock,
    action: () => navigate('/private'),
  },
  {
    id: 'groups',
    label: t('common.sidebar.groups'),
    description: t('search.descriptions.groups'),
    category: 'page',
    icon: UsersRound,
    action: () => withGroup(() => navigate(`/groups`)),
  },
  {
    id: 'admin',
    label: t('common.sidebar.admin'),
    description: t('search.descriptions.admin'),
    category: 'page',
    icon: Settings,
    action: () =>
      withGroup(() => navigate(`/groups/${activeGroupId.value}/settings`)),
    condition: !!activeGroupId.value,
  },
  {
    id: 'games',
    label: t('search.items.games'),
    description: t('search.descriptions.games'),
    category: 'page',
    icon: Gamepad,
    action: () => navigate('/games'),
  },
  {
    id: 'info-dashboard',
    label: t('search.items.info_dashboard'),
    description: t('search.descriptions.info_dashboard'),
    category: 'page',
    icon: Newspaper,
    action: () => navigate('/info-dashboard'),
  },
  {
    id: 'image-tool',
    label: t('search.items.image_tool'),
    description: t('search.descriptions.image_tool'),
    category: 'page',
    icon: Crop,
    action: () => navigate('/imagetool'),
  },
  {
    id: 'toggle-sidebar',
    label: t('common.sidebar.toggle'),
    description: t('search.descriptions.toggle_sidebar'),
    category: 'action',
    icon: PanelLeft,
    action: () => {
      modalStore.toggleSidebar();
      emit('cancel');
    },
    shortcut: ['ctrl', 'shift', 'd'],
  },
  {
    id: 'create-entry',
    label: t('search.items.create_entry'),
    description: t('search.descriptions.create_entry'),
    category: 'action',
    icon: SquarePen,
    action: () => {
      withGroup(() => {
        openItemForm();
      });
      emit('cancel');
    },
    shortcut: ['alt', 'n'],
  },
  {
    id: 'create-private-entry',
    label: t('search.items.create_private_entry'),
    description: t('search.descriptions.create_private_entry'),
    category: 'action',
    icon: Lock,
    action: () => {
      openPrivateTaskForm();
      emit('cancel');
    },
    shortcut: ['alt', 'p'],
  },
  {
    id: 'create-announcement',
    label: t('announcements.actions.create'),
    description: t('announcements.actions.create_description'),
    category: 'action',
    icon: Megaphone,
    action: () => {
      withGroup(() => {
        openAnnouncementForm();
      });
      emit('cancel');
    },
    shortcut: ['alt', 'a'],
    condition: isAnyGroupAdmin.value,
  },
  {
    id: 'switch-group',
    label: t('search.items.switch_group'),
    description: t('search.descriptions.switch_group'),
    category: 'action',
    icon: UsersRound,
    action: () => setMode('group'),
    shortcut: ['ctrl', 'g'],
  },
  {
    id: 'invite-member',
    label: t('auth.groups.invite.invite_button_header'),
    description: t('search.descriptions.invite_member'),
    category: 'action',
    icon: UserRoundPlus,
    action: async () => {
      emit('cancel');
      try {
        const res = await createInvite();
        if (res.ok && res.token) {
          modalStore.openInviteModal(res.token);
        }
      } catch (err) {
        console.error('Failed to generate invite link', err);
      }
    },
    condition: !!activeGroupId.value && checkPermission('invite_members'),
  },
  {
    id: 'create-group',
    label: t('search.items.create_group'),
    description: t('search.descriptions.create_group'),
    category: 'action',
    icon: Plus,
    action: () => {
      modalStore.openCreateGroup();
      emit('cancel');
    },
  },
  {
    id: 'edit-courses',
    label: t('auth.courses.title'),
    description: t('search.descriptions.edit_courses'),
    category: 'action',
    icon: LucideGraduationCap,
    action: () => {
      openSetup();
      emit('cancel');
    },
  },
  {
    id: 'change-theme',
    label: t('auth.settings.theme.title'),
    description: t('search.descriptions.change_theme'),
    category: 'action',
    icon: SunMoon,
    action: () => setMode('theme'),
  },
  {
    id: 'change-language',
    label: t('auth.settings.language.title'),
    description: t('search.descriptions.change_language'),
    category: 'action',
    icon: Languages,
    action: () => setMode('language'),
  },
  {
    id: 'security',
    label: t('auth.security.title'),
    description: t('search.descriptions.security'),
    category: 'action',
    icon: Shield,
    action: () => {
      openSecurity();
      emit('cancel');
    },
  },
  {
    id: 'change-password',
    label: t('auth.change_password.title'),
    description: t('search.descriptions.change_password'),
    category: 'action',
    icon: LucideKeyRound,
    action: () => {
      openChangePassword();
      emit('cancel');
    },
  },
  {
    id: 'logout',
    label: t('auth.actions.logout'),
    description: t('search.descriptions.logout'),
    category: 'action',
    icon: LogOut,
    action: logout,
  },
]);

async function logout() {
  emit('cancel');
  try {
    await hw.post('/auth/logout');
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    userStore.clearUser();
    resetMfaState();
    await appAuthLogout();
    router.push('/');
  }
}

function navigate(path: string) {
  router.push(path);
  emit('cancel');
}

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

const filteredDefaultResults = computed(() =>
  defaultResults.value
    .filter((item) => item.condition ?? true)
    .filter((item) => matchesQuery(item, query.value)),
);

const defaultPageResults = computed(() =>
  filteredDefaultResults.value.filter((r) => r.category === 'page'),
);
const defaultActionResults = computed(() =>
  filteredDefaultResults.value.filter((r) => r.category === 'action'),
);

function globalIndex(item: SearchResult): number {
  return filteredDefaultResults.value.indexOf(item);
}

const filteredGroups = computed(() => {
  if (!query.value) return userGroups.value;
  const q = query.value.toLowerCase();
  return userGroups.value.filter((g) => g.name.toLowerCase().includes(q));
});

async function onSwitchGroup(id: string) {
  emit('cancel');
  const oldGroupId = activeGroupId.value;
  if (id !== oldGroupId) {
    const res = await switchActiveGroup(id);
    if (res.ok) {
      await userStore.fetchUser();

      if (oldGroupId && route.path.startsWith(`/groups/${oldGroupId}`)) {
        const newPath = route.path.replace(
          `/groups/${oldGroupId}`,
          `/groups/${id}`,
        );
        await router.push(newPath);

        if (route.path === '/groups') {
          await router.push(`/groups/${id}/dashboard`);
        }
      } else {
        await router.push(`/groups/${id}/dashboard`);
      }
    } else {
      console.error('Failed to switch group', res.error);
    }
  }
}

const themeOptions = computed(() => [
  { id: 'system', label: t('common.theme.system'), icon: SunMoon },
  { id: 'dark', label: t('common.theme.dark'), icon: Moon },
  { id: 'light', label: t('common.theme.light'), icon: Sun },
]);

const filteredThemes = computed(() => {
  if (!query.value) return themeOptions.value;
  const q = query.value.toLowerCase();
  return themeOptions.value.filter((o) => o.label.toLowerCase().includes(q));
});

function onSwitchTheme(id: string) {
  setPreference('theme', id as any);
  emit('cancel');
}

const languageOptions = [
  { id: 'de', label: 'Deutsch', icon: Languages },
  { id: 'en', label: 'English', icon: Languages },
];

const filteredLanguages = computed(() => {
  if (!query.value) return languageOptions;
  const q = query.value.toLowerCase();
  return languageOptions.filter((o) => o.label.toLowerCase().includes(q));
});

function onSwitchLanguage(id: string) {
  setPreference('language', id as any);
  emit('cancel');
}

const paletteProps = computed(() => {
  if (mode.value === 'group') {
    return {
      itemCount: filteredGroups.value.length,
      placeholder: t('search.items.switch_group'),
      title: t('search.items.switch_group'),
      prefix: 'group-result-',
    };
  }
  if (mode.value === 'theme') {
    return {
      itemCount: filteredThemes.value.length,
      placeholder: t('search.descriptions.change_theme'),
      title: t('auth.settings.theme.title'),
      prefix: 'theme-result-',
    };
  }
  if (mode.value === 'language') {
    return {
      itemCount: filteredLanguages.value.length,
      placeholder: t('search.descriptions.change_language'),
      title: t('auth.settings.language.title'),
      prefix: 'language-result-',
    };
  }
  return {
    itemCount: filteredDefaultResults.value.length,
    placeholder: t('search.modal.placeholder'),
    title: t('search.modal.title'),
    prefix: 'search-result-',
  };
});

function handleSelect(index: number) {
  if (mode.value === 'group') {
    const group = filteredGroups.value[index];
    if (group) onSwitchGroup(group.id);
  } else if (mode.value === 'theme') {
    const theme = filteredThemes.value[index];
    if (theme) onSwitchTheme(theme.id);
  } else if (mode.value === 'language') {
    const lang = filteredLanguages.value[index];
    if (lang) onSwitchLanguage(lang.id);
  } else {
    filteredDefaultResults.value[index]?.action();
  }
}
</script>

<template>
  <BaseCommandPalette
    v-model="query"
    :item-count="paletteProps.itemCount"
    :placeholder="paletteProps.placeholder"
    :title="paletteProps.title"
    :id-prefix="paletteProps.prefix"
    @select="handleSelect"
    @cancel="$emit('cancel')"
    @keydown.capture="onKeydown"
  >
    <template #default="{ selectedIndex, setSelectedIndex }">
      <template v-if="mode === 'group'">
        <div
          class="px-4 py-1.5 flex items-center gap-2 text-xs text-on-ghost-muted font-semibold uppercase tracking-wider mb-1"
        >
          <button
            class="hover:text-on-ghost transition-colors inline-flex items-center"
            :aria-label="t('common.buttons.back')"
            @click="setMode('default')"
          >
            <ArrowLeft :size="14" class="mr-1" />
            {{ t('common.buttons.back') }}
          </button>
          <span class="opacity-50">/</span>
          <span>{{ t('search.items.switch_group') }}</span>
        </div>
        <template v-if="filteredGroups.length">
          <BaseCommandPaletteItem
            v-for="(group, index) in filteredGroups"
            :id="'group-result-' + index"
            :key="group.id"
            :active="selectedIndex === index"
            :label="group.name"
            :avatar-text="group.name.charAt(0).toUpperCase()"
            @click="onSwitchGroup(group.id)"
            @mouseenter="setSelectedIndex(index)"
          >
            <template #icon>
              <Avatar
                :name="group.name"
                :picture="group.avatarUrl"
                :unread="group.hasUnreadContent"
                :size="8"
              />
            </template>

            <ArrowUpRight
              v-if="selectedIndex === index"
              :size="16"
              class="shrink-0 text-on-ghost-subtle"
            />
          </BaseCommandPaletteItem>
        </template>
      </template>

      <template v-else-if="mode === 'theme'">
        <div
          class="px-4 py-1.5 flex items-center gap-2 text-xs text-on-ghost-muted font-semibold uppercase tracking-wider mb-1"
        >
          <button
            class="hover:text-on-ghost transition-colors inline-flex items-center"
            :aria-label="t('common.buttons.back')"
            @click="setMode('default')"
          >
            <ArrowLeft :size="14" class="mr-1" />
            {{ t('common.buttons.back') }}
          </button>
          <span class="opacity-50">/</span>
          <span>{{ t('auth.settings.theme.title') }}</span>
        </div>
        <template v-if="filteredThemes.length">
          <BaseCommandPaletteItem
            v-for="(opt, index) in filteredThemes"
            :id="'theme-result-' + index"
            :key="opt.id"
            :active="selectedIndex === index"
            :label="opt.label"
            :icon="opt.icon"
            @click="onSwitchTheme(opt.id)"
            @mouseenter="setSelectedIndex(index)"
          >
            <Check
              v-if="currentTheme === opt.id"
              :size="16"
              class="shrink-0 text-on-ghost"
            />
          </BaseCommandPaletteItem>
        </template>
      </template>

      <template v-else-if="mode === 'language'">
        <div
          class="px-4 py-1.5 flex items-center gap-2 text-xs text-on-ghost-muted font-semibold uppercase tracking-wider mb-1"
        >
          <button
            class="hover:text-on-ghost transition-colors inline-flex items-center"
            :aria-label="t('common.buttons.back')"
            @click="setMode('default')"
          >
            <ArrowLeft :size="14" class="mr-1" />
            {{ t('common.buttons.back') }}
          </button>
          <span class="opacity-50">/</span>
          <span>{{ t('auth.settings.language.title') }}</span>
        </div>
        <template v-if="filteredLanguages.length">
          <BaseCommandPaletteItem
            v-for="(opt, index) in filteredLanguages"
            :id="'language-result-' + index"
            :key="opt.id"
            :active="selectedIndex === index"
            :label="opt.label"
            :icon="opt.icon"
            @click="onSwitchLanguage(opt.id)"
            @mouseenter="setSelectedIndex(index)"
          >
            <Check
              v-if="currentLanguage === opt.id"
              :size="16"
              class="shrink-0 text-on-ghost"
            />
          </BaseCommandPaletteItem>
        </template>
      </template>

      <template v-else>
        <template v-if="defaultPageResults.length">
          <div class="px-4 py-1.5">
            <span
              class="text-xs text-on-ghost-muted font-semibold uppercase tracking-wider"
            >
              {{ t('search.modal.category_pages') }}
            </span>
          </div>
          <BaseCommandPaletteItem
            v-for="item in defaultPageResults"
            :id="'search-result-' + globalIndex(item)"
            :key="item.id"
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
              class="shrink-0 text-on-ghost-subtle"
            />
          </BaseCommandPaletteItem>
        </template>

        <template v-if="defaultActionResults.length">
          <div
            class="px-4 py-1.5"
            :class="defaultPageResults.length ? 'mt-2' : ''"
          >
            <span
              class="text-xs text-on-ghost-muted font-semibold uppercase tracking-wider"
            >
              {{ t('search.modal.category_actions') }}
            </span>
          </div>
          <BaseCommandPaletteItem
            v-for="item in defaultActionResults"
            :id="'search-result-' + globalIndex(item)"
            :key="item.id"
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
                class="text-on-ghost-subtle"
              />
            </span>
          </BaseCommandPaletteItem>
        </template>
      </template>

      <div
        v-if="paletteProps.itemCount === 0"
        class="px-4 py-10 flex flex-col items-center gap-2 text-center"
      >
        <Search :size="28" class="text-on-ghost-subtle mb-1" />
        <p class="text-sm text-on-ghost-muted m-0">
          {{ t('global.search.noResults') }}
          <strong class="text-on-ghost">„{{ query }}"</strong>
        </p>
      </div>
    </template>
  </BaseCommandPalette>
</template>
