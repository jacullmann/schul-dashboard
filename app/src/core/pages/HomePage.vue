<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { UserRoundPlus, Plus, ChevronRight, UsersRound } from '@lucide/vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { useWindowSize } from '@vueuse/core';

const { t } = useI18n();

const { width: windowWidth } = useWindowSize();

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
  if (navigatingGroupId.value) return;
  navigatingGroupId.value = groupId;

  try {
    if (groupId === activeGroupId.value) {
      await router.push(`/groups/${groupId}/items/all`);
      return;
    }

    const res = await switchActiveGroup(groupId);
    if (res.ok) {
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
  <div class="md:p-4">
    <section class="max-md:pt-4 max-md:px-4 mb-4 md:mb-8">
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

        <div class="relative" v-if="userGroups.length > 0">
          <BaseTooltip content="Add group" placement="bottom">
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
              @click="(modalStore.openJoinGroup(), (addGroup = false))"
              >{{ t('groups.home.joinGroup') }}</BaseMenuButton
            >
            <BaseMenuButton
              :icon="Plus"
              @click="(modalStore.openCreateGroup(), (addGroup = false))"
              >{{ t('groups.home.createGroup') }}</BaseMenuButton
            >
          </BaseMenu>
        </div>
      </div>
    </section>

    <section v-if="userGroups.length > 0" class="mb-9">
      <div class="flex items-center gap-2.5 mb-4 max-md:px-4">
        <h2 class="text-2xl font-bold text-on-ghost m-0 animate-fade-up">
          {{ t('groups.home.yourGroups') }}
        </h2>
        <span
          class="text-on-ghost-muted bg-ghost-hover rounded-full text-sm font-semibold px-2.5 py-0.5 animate-fade-up"
          >{{ userGroups.length }}</span
        >
      </div>
      <div class="flex flex-col md:gap-2">
        <button
          v-for="(group, index) in userGroups"
          :key="group.id"
          v-wave
          class="relative group flex items-center w-full gap-2 py-3 px-6 md:px-3.5 md:py-3 md:rounded-xl bg-transparent md:bg-surface md:border border-surface-border md:shadow-input cursor-pointer text-left transition-hover hover:bg-ghost-hover md:hover:bg-surface-highlight disabled:opacity-50 md:[.active]:bg-action md:[.active]:border-action md:[.active]:hover:bg-action-hover animate-fade-up"
          :style="{
            animationDelay: `${index * 0.075}s`,
            animationFillMode: 'both',
          }"
          :class="{ active: group.id === 'mock-group-4' }"
          @click="navigateToGroup(group.id)"
          :disabled="navigatingGroupId === group.id"
        >
          <span
            class="absolute transition-[max-height,width,top,opacity] duration-200 left-0 group-[.active]:top-0 group-hover:top-[25%] top-[45%] bottom-0 w-0.5 opacity-0 group-[.active]:w-1.5 group-hover:w-1.5 group-[.active]:opacity-100 group-hover:opacity-100 group-[.active]:max-h-full group-hover:max-h-[50%] max-h-[10%] bg-action rounded-r-full md:hidden"
          ></span>
          <Avatar
            class="size-9 md:size-10"
            :name="group.name"
            :picture="group.avatarUrl"
            :size="windowWidth < 768 ? 9 : 10"
          />
          <span class="flex flex-col flex-1 gap-0.5">
            <span class="flex items-center gap-1.5 overflow-hidden">
              <span
                class="font-semibold text-base text-on-ghost md:group-[.active]:text-on-action truncate"
              >
                {{ group.name }}
              </span>
              <NotificationDot
                v-if="group.hasUnreadContent"
                class="max-md:hidden"
              />
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
            class="hidden md:block transition duration-150 ease-in-out opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100 text-on-ghost-muted md:group-[.active]:text-on-action-muted"
          />

          <NotificationDot
            v-if="group.hasUnreadContent"
            class="md:hidden"
            :size="3"
          />
        </button>
      </div>
    </section>

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

    <div v-if="loading" class="flex justify-center p-10">
      <div
        class="w-7 h-7 border-2 border-canvas-border border-t-on-ghost rounded-full animate-spin"
      ></div>
    </div>
  </div>
</template>
