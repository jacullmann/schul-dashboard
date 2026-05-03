<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import {
  UserRoundPlus,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  UsersRound,
} from '@lucide/vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const router = useRouter();
const userStore = useUserStore();
const modalStore = useModalStore();
const { user } = storeToRefs(userStore);
const { activeGroupId, userGroups, switchActiveGroup } = useAppAuth();

const loading = ref(false);
const addGroup = ref(false);
const navigatingGroupId = ref<string | null>(null);
const allGroups = ref<
  Array<{ id: string; name: string; memberCount: number; created_at: string }>
>([]);

const isSuperadmin = computed(() => user.value?.role === 'superadmin');

const displayName = computed(() => {
  if (!user.value?.email) return '';
  return user.value.email.split('@')[0];
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return 'groups.home.goodNight';
  if (h < 12) return 'groups.home.goodMorning';
  if (h < 18) return 'groups.home.goodDay';
  return 'groups.home.goodEvening';
});

const roleColors: Record<string, string> = {
  admin: 'text-[#6366f1]',
  moderator: 'text-[#f59e0b]',
  user: 'text-on-ghost-muted',
  superadmin: 'text-danger',
};

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Admin',
    moderator: 'Moderator',
    user: 'Member',
    superadmin: 'Super Admin',
  };
  return map[role] || role;
}

async function navigateToGroup(groupId: string) {
  if (navigatingGroupId.value) return; // Prevent double-clicks
  navigatingGroupId.value = groupId;

  try {
    // If this is already the active group, just navigate
    if (groupId === activeGroupId.value) {
      await router.push(`/groups/${groupId}/items/all`);
      return;
    }

    // Switch the active group first
    const res = await switchActiveGroup(groupId);
    if (res.ok) {
      // Now navigate — the router guard will see the updated activeGroupId
      await router.push(`/groups/${groupId}/items/all`);
    } else {
      console.error('Failed to switch group:', res.error);
    }
  } catch (err) {
    console.error('Navigation error:', err);
  } finally {
    navigatingGroupId.value = null;
  }
}

async function loadAllGroups() {
  if (!isSuperadmin.value) return;
  loading.value = true;
  try {
    const { data } = await hw.get('/api/admin/groups');
    allGroups.value = data;
  } catch (err) {
    console.error('Failed to load groups:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAllGroups();
});
</script>

<template>
  <div class="p-4 md:p-0">
    <!-- Welcome Banner -->
    <section class="mb-4 md:mb-8">
      <div class="flex justify-between items-start gap-4">
        <div>
          <h2 class="animate-fade-up">
            {{ t(greeting) }}<span v-if="user">, </span
            ><span
              v-if="user"
              class="bg-[image:var(--background-image-bismuth)] bg-clip-text text-transparent"
              >{{ displayName }}</span
            >
          </h2>
          <p class="text-base/relaxed text-on-ghost-muted m-0 animate-fade-up">
            {{
              userGroups.length
                ? 'Wähle eine Gruppe aus, um loszulegen.'
                : 'Tritt einer Gruppe bei oder erstelle eine neue.'
            }}
          </p>
        </div>

        <!-- Regular User: Join/Create Group -->
        <BaseTooltip
          v-if="userGroups.length > 0"
          content="Add group"
          placement="bottom"
        >
          <BaseButton
            @click="addGroup = true"
            variant="action"
            :icon="Plus"
            class="animate-fade-up"
          />
        </BaseTooltip>
        <BaseMenu
          :open="addGroup"
          @close="addGroup = false"
          @cancel="addGroup = false"
          class="right-0 top-full mt-2 min-w-[200px]"
          ><BaseMenuButton
            :icon="UserRoundPlus"
            @click="(modalStore.openCreateGroup(), (addGroup = false))"
            >{{ t('groups.home.joinGroup') }}</BaseMenuButton
          >
          <BaseMenuButton
            :icon="Plus"
            @click="(modalStore.openJoinGroup(), (addGroup = false))"
            >{{ t('groups.home.createGroup') }}</BaseMenuButton
          >
        </BaseMenu>
      </div>
    </section>

    <!-- Regular User: My Groups -->
    <section v-if="userGroups.length > 0" class="mb-9">
      <div class="flex items-center gap-2.5 mb-4">
        <h2 class="text-2xl font-bold text-on-ghost m-0 animate-fade-up">
          {{ t('groups.home.yourGroups') }}
        </h2>
        <span
          class="text-on-ghost-muted bg-ghost-hover rounded-full text-sm font-semibold px-2.5 py-0.5 animate-fade-up"
          >{{ userGroups.length }}</span
        >
      </div>
      <div class="flex flex-col gap-2">
        <button
          v-for="(group, index) in userGroups"
          :key="group.id"
          class="group flex items-center w-full gap-2 p-3 sm:px-3.5 sm:py-3 rounded-xl bg-surface border border-surface-border shadow-input cursor-pointer text-left transition-hover hover:bg-surface-highlight disabled:opacity-50 [.active]:bg-action [.active]:border-action [.active]:hover:bg-action-hover animate-fade-up"
          :style="{
            animationDelay: `${index * 0.075}s`,
            animationFillMode: 'both',
          }"
          :class="{ active: group.id === activeGroupId }"
          @click="navigateToGroup(group.id)"
          :disabled="navigatingGroupId === group.id"
        >
          <span
            class="text-on-ghost-muted group-[.active]:text-on-action flex items-center justify-center size-9 sm:size-10 shrink-0 transition-hover group-hover:text-on-ghost"
          >
            <component
              :is="group.id === activeGroupId ? FolderOpen : Folder"
              :size="24"
            />
          </span>
          <span class="flex flex-col flex-1 gap-0.5">
            <span class="flex items-center gap-1.5 overflow-hidden">
              <span
                class="font-semibold text-base text-on-ghost group-[.active]:text-on-action truncate"
              >
                {{ group.name }}
              </span>
              <NotificationDot v-if="group.hasUnreadContent" />
            </span>
            <span
              class="text-xs font-semibold uppercase tracking-wider"
              :class="roleColors[group.role]"
            >
              {{ roleLabel(group.role) }}
            </span>
          </span>

          <ChevronRight
            :size="16"
            class="transition duration-150 ease-in-out opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100 text-on-ghost-muted group-[.active]:text-on-action-muted"
          />
        </button>
      </div>
    </section>

    <!-- Empty State -->
    <section v-if="!isSuperadmin && userGroups.length === 0 && !loading">
      <BaseEmptyState
        :icon="UsersRound"
        :primary-action="() => modalStore.openJoinGroup()"
        :secondary-action="() => modalStore.openCreateGroup()"
      >
        <template #title>{{ t('groups.home.noGroups') }}</template>
        <template #message>{{ t('groups.home.joinGroupText') }}</template>
        <template #primary-action-label>{{
          t('groups.home.joinGroup')
        }}</template>
        <template #secondary-action-label>{{
          t('groups.home.createGroup')
        }}</template>
      </BaseEmptyState>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center p-10">
      <div
        class="w-7 h-7 border-2 border-canvas-border border-t-on-ghost rounded-full animate-spin"
      ></div>
    </div>
  </div>
</template>
