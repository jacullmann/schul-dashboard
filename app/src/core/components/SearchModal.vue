<script setup lang="ts">
import { ref, computed, type Component } from 'vue';
import {
  useRouter,
  useRoute,
  type RouteLocationRaw,
  type RouteRecordName,
} from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLogout } from '@/core/composables/useLogout';
import { useTaskForm } from '@/core/composables/useTaskForm';
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
  SlidersHorizontal,
  Key,
  BookOpen,
  Crown,
  Flag,
  Building2,
  Gamepad,
  Newspaper,
  Crop,
  SquarePen,
  UserRoundPlus,
  UserRoundCog,
  UserRound,
  Plus,
  Search,
  ChevronRight,
  ArrowUpRight,
  LucideGraduationCap,
  Filter,
  LayoutGrid,
  SunMoon,
  Languages,
  LucideKeyRound,
  Shield,
  Trash2,
  LogOut,
  PanelLeft,
  Moon,
  Sun,
  Check,
  ArrowLeft,
} from '@lucide/vue';
import { useModalStore, type SearchMode } from '@/stores/modalStore';
import { useAccountModals } from '@/modules/auth/composables/useAccountModals';
import { usePersonalization } from '@/modules/auth/composables/usePersonalization';
import { useUserStore } from '@/stores/userStore';
import { usePreferences } from '@/common/composables/usePreferences';
import type { ThemeMode } from '@/common/composables/useTheme';
import { useGroupAction } from '@/core/composables/useGroupAction';
import { rankByQuery } from '@/utils/search-rank';
import Avatar from '@/modules/auth/components/Avatar.vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const {
  activeGroupId,
  userGroups,
  switchActiveGroup,
  checkPermission,
  createInvite,
} = useAppAuth();
const { openTaskForm } = useTaskForm();
const { openPrivateTaskForm } = usePrivateTaskForm();
const { openAnnouncementForm } = useAnnouncementForm();
const { openChangePassword, openDeleteAccount } = useAccountModals();
const { setPersonalization } = usePersonalization();
const userStore = useUserStore();
const performLogout = useLogout();
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

function setMode(newMode: SearchMode) {
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
  /** The page this item is a subpage of; shown with it and searchable. */
  parent?: string;
  category: ResultCategory;
  icon: Component;
  action: () => void | Promise<void>;
  shortcut?: string[];
  condition?: boolean;
  /** Too specific for the unfiltered list; only shown once it matches a query. */
  searchOnly?: boolean;
}

function navigate(to: RouteLocationRaw) {
  void router.push(to);
  emit('cancel');
}

function navigateInGroup(
  name: RouteRecordName,
  params: Record<string, string> = {},
) {
  withGroup(() =>
    navigate({ name, params: { groupId: activeGroupId.value, ...params } }),
  );
}

function runAndClose(action: () => void) {
  action();
  emit('cancel');
}

const groupSettingsTabs = computed<SearchResult[]>(() =>
  (
    [
      { tab: 'general', icon: SlidersHorizontal },
      { tab: 'members', icon: UsersRound },
      { tab: 'permissions', icon: Key },
      { tab: 'schedule', icon: CalendarDays },
      { tab: 'subjects', icon: BookOpen },
      { tab: 'announcements', icon: Megaphone },
    ] as const
  ).map(({ tab, icon }) => ({
    id: `group-settings-${tab}`,
    label: t(`groups.settings.nav.${tab}.label`),
    description: t(`groups.settings.nav.${tab}.description`),
    parent: t('common.sidebar.admin'),
    category: 'page',
    icon,
    action: () => navigateInGroup('group-admin', { tab }),
    condition: !!activeGroupId.value,
    searchOnly: true,
  })),
);

const defaultResults = computed<SearchResult[]>(() => [
  {
    id: 'dashboard',
    label: t('common.sidebar.dashboard'),
    description: t('search.descriptions.home'),
    category: 'page',
    icon: House,
    action: () => navigateInGroup('group-dashboard'),
  },
  {
    id: 'tasks',
    label: t('common.sidebar.tasks'),
    description: t('search.descriptions.tasks'),
    category: 'page',
    icon: ListTodo,
    action: () => navigateInGroup('group-tasks'),
  },
  {
    id: 'schedule',
    label: t('common.sidebar.schedule'),
    description: t('search.descriptions.schedule'),
    category: 'page',
    icon: CalendarDays,
    action: () => navigateInGroup('group-schedule'),
  },
  {
    id: 'messages',
    label: t('common.sidebar.messages'),
    description: t('search.descriptions.messages'),
    category: 'page',
    icon: MessageCircle,
    action: () => navigateInGroup('group-messages'),
  },
  {
    id: 'admin',
    label: t('common.sidebar.admin'),
    description: t('search.descriptions.admin'),
    category: 'page',
    icon: Settings,
    action: () => navigateInGroup('group-admin'),
    condition: !!activeGroupId.value,
  },
  ...groupSettingsTabs.value,
  {
    id: 'superadmin',
    label: t('common.roles.superadmin'),
    description: t('search.descriptions.superadmin'),
    category: 'page',
    icon: Crown,
    action: () => navigate({ name: 'super-admin' }),
    condition: userStore.isSuperadmin,
  },
  {
    id: 'superadmin-users',
    label: t('admin.nav.users'),
    description: t('search.descriptions.admin_users'),
    parent: t('common.roles.superadmin'),
    category: 'page',
    icon: UsersRound,
    action: () => navigate({ name: 'admin-users' }),
    condition: userStore.isSuperadmin,
    searchOnly: true,
  },
  {
    id: 'superadmin-reports',
    label: t('admin.nav.reports'),
    description: t('search.descriptions.admin_reports'),
    parent: t('common.roles.superadmin'),
    category: 'page',
    icon: Flag,
    action: () => navigate({ name: 'admin-reports' }),
    condition: userStore.isSuperadmin,
    searchOnly: true,
  },
  {
    id: 'superadmin-groups',
    label: t('admin.nav.groups'),
    description: t('search.descriptions.admin_groups'),
    parent: t('common.roles.superadmin'),
    category: 'page',
    icon: Building2,
    action: () => navigate({ name: 'admin-groups' }),
    condition: userStore.isSuperadmin,
    searchOnly: true,
  },
  {
    id: 'groups',
    label: t('common.sidebar.groups'),
    description: t('search.descriptions.groups'),
    category: 'page',
    icon: UsersRound,
    action: () => navigate({ name: 'groups' }),
  },
  {
    id: 'private',
    label: t('common.sidebar.private'),
    description: t('search.descriptions.private'),
    category: 'page',
    icon: Lock,
    action: () => navigate({ name: 'private-todos' }),
  },
  {
    id: 'account-settings',
    label: t('auth.account_settings.title'),
    description: t('search.descriptions.account_settings'),
    category: 'page',
    icon: UserRoundCog,
    action: () => navigate({ name: 'account-settings' }),
  },
  {
    id: 'security',
    label: t('auth.account_settings.security.title'),
    description: t('search.descriptions.security'),
    parent: t('auth.account_settings.title'),
    category: 'page',
    icon: Shield,
    action: () =>
      navigate({ name: 'account-settings', params: { tab: 'security' } }),
  },
  {
    id: 'account',
    label: t('auth.account_settings.account.title'),
    description: t('search.descriptions.account'),
    parent: t('auth.account_settings.title'),
    category: 'page',
    icon: UserRound,
    action: () =>
      navigate({ name: 'account-settings', params: { tab: 'account' } }),
    searchOnly: true,
  },
  {
    id: 'games',
    label: t('search.items.games'),
    description: t('search.descriptions.games'),
    category: 'page',
    icon: Gamepad,
    action: () => navigate({ name: 'games' }),
  },
  {
    id: 'info-dashboard',
    label: t('search.items.info_dashboard'),
    description: t('search.descriptions.info_dashboard'),
    category: 'page',
    icon: Newspaper,
    action: () => navigate({ name: 'info-dashboard' }),
  },
  {
    id: 'image-tool',
    label: t('search.items.image_tool'),
    description: t('search.descriptions.image_tool'),
    category: 'page',
    icon: Crop,
    action: () => navigate({ name: 'imagetool' }),
  },
  {
    id: 'toggle-sidebar',
    label: t('common.sidebar.toggle'),
    description: t('search.descriptions.toggle_sidebar'),
    category: 'action',
    icon: PanelLeft,
    action: () => runAndClose(modalStore.toggleSidebar),
    shortcut: ['ctrl', 'shift', 'd'],
  },
  {
    id: 'create-entry',
    label: t('search.items.create_task'),
    description: t('search.descriptions.create_task'),
    category: 'action',
    icon: SquarePen,
    action: () => withGroup(() => runAndClose(openTaskForm)),
    shortcut: ['alt', 'n'],
  },
  {
    id: 'create-private-entry',
    label: t('search.items.create_private_task'),
    description: t('search.descriptions.create_private_task'),
    category: 'action',
    icon: Lock,
    action: () => runAndClose(openPrivateTaskForm),
    shortcut: ['alt', 'p'],
  },
  {
    id: 'create-announcement',
    label: t('announcements.actions.create'),
    description: t('announcements.actions.create_description'),
    category: 'action',
    icon: Megaphone,
    action: () => withGroup(() => runAndClose(openAnnouncementForm)),
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
    action: () => runAndClose(modalStore.openCreateGroup),
  },
  {
    id: 'edit-courses',
    label: t('auth.courses.title'),
    description: t('search.descriptions.edit_courses'),
    category: 'action',
    icon: LucideGraduationCap,
    action: () => navigateInGroup('group-admin', { tab: 'courses' }),
    condition: !!activeGroupId.value,
  },
  {
    id: 'change-personalization',
    label: t('auth.settings.personalization'),
    description: t('search.descriptions.personalization'),
    category: 'action',
    icon: Filter,
    action: () => setMode('personalization'),
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
    id: 'change-password',
    label: t('auth.change_password.title'),
    description: t('search.descriptions.change_password'),
    category: 'action',
    icon: LucideKeyRound,
    action: () => runAndClose(openChangePassword),
  },
  {
    id: 'delete-account',
    label: t('auth.delete_account.title'),
    description: t('search.descriptions.delete_account'),
    category: 'action',
    icon: Trash2,
    action: () => runAndClose(openDeleteAccount),
    searchOnly: true,
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
  await performLogout();
}

const availableResults = computed(() =>
  defaultResults.value.filter((item) => item.condition ?? true),
);

interface ResultSection {
  title: string;
  items: SearchResult[];
}

const resultSections = computed<ResultSection[]>(() => {
  if (query.value.trim()) {
    const ranked = rankByQuery(availableResults.value, query.value, (item) => [
      { text: item.label, weight: 1 },
      { text: item.parent ?? '', weight: 0.7 },
      { text: item.description ?? '', weight: 0.5 },
    ]);
    return ranked.length
      ? [{ title: t('search.modal.category_results'), items: ranked }]
      : [];
  }

  const browsable = availableResults.value.filter((item) => !item.searchOnly);
  return [
    {
      title: t('search.modal.category_pages'),
      items: browsable.filter((item) => item.category === 'page'),
    },
    {
      title: t('search.modal.category_actions'),
      items: browsable.filter((item) => item.category === 'action'),
    },
  ].filter((section) => section.items.length);
});

const visibleResults = computed(() =>
  resultSections.value.flatMap((section) => section.items),
);

const resultIndex = computed(
  () => new Map(visibleResults.value.map((item, index) => [item.id, index])),
);

function globalIndex(item: SearchResult): number {
  return resultIndex.value.get(item.id) ?? -1;
}

const filteredGroups = computed(() =>
  rankByQuery(userGroups.value, query.value, (g) => [
    { text: g.name, weight: 1 },
  ]),
);

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

interface ChoiceOption {
  id: string;
  label: string;
  icon: Component;
}

interface ChoiceMode {
  title: string;
  placeholder: string;
  options: ChoiceOption[];
  current: string;
  select: (id: string) => void;
}

const choiceModes = computed<Partial<Record<SearchMode, ChoiceMode>>>(() => ({
  theme: {
    title: t('auth.settings.theme.title'),
    placeholder: t('search.descriptions.change_theme'),
    options: [
      { id: 'system', label: t('common.theme.system'), icon: SunMoon },
      { id: 'dark', label: t('common.theme.dark'), icon: Moon },
      { id: 'light', label: t('common.theme.light'), icon: Sun },
    ],
    current: currentTheme.value,
    select: (id) => setPreference('theme', id as ThemeMode),
  },
  language: {
    title: t('auth.settings.language.title'),
    placeholder: t('search.descriptions.change_language'),
    options: [
      { id: 'de', label: 'Deutsch', icon: Languages },
      { id: 'en', label: 'English', icon: Languages },
    ],
    current: currentLanguage.value,
    select: (id) => setPreference('language', id),
  },
  personalization: {
    title: t('auth.settings.personalization'),
    placeholder: t('search.descriptions.personalization'),
    options: [
      {
        id: 'mine',
        label: t('auth.settings.personalization_options.mine'),
        icon: Filter,
      },
      {
        id: 'all',
        label: t('auth.settings.personalization_options.all'),
        icon: LayoutGrid,
      },
    ],
    current: (userStore.user?.personalized ?? true) ? 'mine' : 'all',
    select: (id) => void setPersonalization(id === 'mine'),
  },
}));

const activeChoiceMode = computed(() => choiceModes.value[mode.value]);

const filteredChoices = computed(() =>
  rankByQuery(activeChoiceMode.value?.options ?? [], query.value, (o) => [
    { text: o.label, weight: 1 },
  ]),
);

function onSelectChoice(id: string) {
  const choiceMode = activeChoiceMode.value;
  if (choiceMode && id !== choiceMode.current) choiceMode.select(id);
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
  if (activeChoiceMode.value) {
    return {
      itemCount: filteredChoices.value.length,
      placeholder: activeChoiceMode.value.placeholder,
      title: activeChoiceMode.value.title,
      prefix: `${mode.value}-result-`,
    };
  }
  return {
    itemCount: visibleResults.value.length,
    placeholder: t('search.modal.placeholder'),
    title: t('search.modal.title'),
    prefix: 'search-result-',
  };
});

function handleSelect(index: number) {
  if (mode.value === 'group') {
    const group = filteredGroups.value[index];
    if (group) void onSwitchGroup(group.id);
  } else if (activeChoiceMode.value) {
    const choice = filteredChoices.value[index];
    if (choice) onSelectChoice(choice.id);
  } else {
    void visibleResults.value[index]?.action();
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
        <BaseRow class="m-2">
          <BaseButton :icon="ArrowLeft" size="sm" @click="setMode('default')" />
          <span class="text-sm text-on-ghost-muted font-medium">{{
            t('search.items.switch_group')
          }}</span>
        </BaseRow>
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

      <template v-else-if="activeChoiceMode">
        <BaseRow class="m-2">
          <BaseButton :icon="ArrowLeft" size="sm" @click="setMode('default')" />
          <span class="text-sm text-on-ghost-muted font-medium">{{
            activeChoiceMode.title
          }}</span>
        </BaseRow>
        <BaseCommandPaletteItem
          v-for="(opt, index) in filteredChoices"
          :id="paletteProps.prefix + index"
          :key="opt.id"
          :active="selectedIndex === index"
          :label="opt.label"
          :icon="opt.icon"
          @click="onSelectChoice(opt.id)"
          @mouseenter="setSelectedIndex(index)"
        >
          <Check
            v-if="activeChoiceMode.current === opt.id"
            :size="16"
            class="shrink-0 text-on-ghost"
          />
        </BaseCommandPaletteItem>
      </template>

      <template v-else>
        <template
          v-for="(section, sectionIndex) in resultSections"
          :key="section.title"
        >
          <div class="px-4 py-1.5" :class="sectionIndex > 0 ? 'mt-2' : ''">
            <span class="text-sm text-on-ghost-muted font-medium">
              {{ section.title }}
            </span>
          </div>
          <BaseCommandPaletteItem
            v-for="item in section.items"
            :id="'search-result-' + globalIndex(item)"
            :key="item.id"
            :active="selectedIndex === globalIndex(item)"
            :label="item.label"
            :parent="item.parent"
            :description="item.description"
            :icon="item.icon"
            @click="void item.action()"
            @mouseenter="setSelectedIndex(globalIndex(item))"
          >
            <template v-if="selectedIndex === globalIndex(item)">
              <ArrowUpRight
                v-if="item.category === 'page'"
                :size="14"
                class="shrink-0 text-on-ghost-subtle"
              />
              <span v-else class="flex items-center gap-2 shrink-0">
                <BaseKbdGroup v-if="item.shortcut" :keys="item.shortcut" />
                <ChevronRight :size="14" class="text-on-ghost-subtle" />
              </span>
            </template>
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
