<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
  UsersRound,
  LogOut,
  MoreHorizontal,
  Star,
} from '@lucide/vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';
import type { UnitOption } from '@/common/components/BaseSelect.vue';

const { t } = useI18n();

const router = useRouter();
const userStore = useUserStore();
const modalStore = useModalStore();
const { user } = storeToRefs(userStore);
const { activeGroupId, userGroups, switchActiveGroup } = useAppAuth();

const loading = ref(false);
const navigatingGroupId = ref<string | null>(null);
const openMenuId = ref<string | null>(null);

const closeMenu = () => {
  openMenuId.value = null;
};

onMounted(() => {
  window.addEventListener('click', closeMenu);
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenu);
  window.removeEventListener('keydown', handleEscape);
});

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeMenu();
};

const isSuperadmin = computed(() => user.value?.role === 'superadmin');
const defaultGroupId = computed({
  get: () => user.value?.preferences?.defaultGroupId || '',
  set: (val: string) => {
    if (val && val !== user.value?.preferences?.defaultGroupId) {
      setDefaultGroup(val);
    }
  },
});

const groupOptions = computed<UnitOption[]>(() =>
  userGroups.value.map((group) => ({
    label: group.name,
    value: group.id,
  })),
);

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

async function setDefaultGroup(groupId: string) {
  loading.value = true;
  try {
    await hw.patch('/api/user/preferences', { defaultGroupId: groupId });
    if (user.value) {
      if (!user.value.preferences) user.value.preferences = {};
      user.value.preferences.defaultGroupId = groupId;
    }
  } catch (err) {
    console.error('Failed to set default group:', err);
  } finally {
    loading.value = false;
  }
}

async function leaveGroup(group: any) {
  const isConfirmed = await modalStore.confirm({
    title: 'Leave Group?',
    content: `Are you sure you want to leave the group "${group.name}"?`,
    submitText: 'Leave',
    danger: true,
  });

  if (group.ownerId === user.value?.id) {
    alert(
      'The owner cannot leave the group. Transfer ownership or delete the group instead.',
    );
    return;
  }
  if (!isConfirmed) return;

  loading.value = true;
  try {
    await hw.delete(`/api/groups/${group.id}/leave`);
    window.location.reload();
  } catch (err) {
    console.error('Failed to leave group:', err);
    alert('Failed to leave group.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-4 md:p-0">
    <section class="mb-8">
      <div
        class="flex justify-between items-start gap-4 sm:gap-6 max-sm:flex-col"
      >
        <div>
          <h2>Groups Management</h2>
          <p class="text-base/relaxed text-on-ghost-muted m-0">
            Manage your groups, leave or set a default group.
          </p>
        </div>

        <div
          class="flex gap-2 shrink-0 max-sm:w-full max-sm:flex-wrap [&>.btn]:max-sm:flex-1 [&>.btn]:max-sm:justify-center [&>.btn]:max-sm:min-w-0"
          v-if="userGroups.length > 0"
        >
          <BaseButton
            @click="modalStore.openJoinGroup"
            variant="action"
            :icon="UserRoundPlus"
          >
            <span>{{ t('groups.home.joinGroup') }}</span>
          </BaseButton>
          <BaseButton
            @click="modalStore.openCreateGroup"
            variant="ghost"
            :icon="Plus"
          >
            <span>{{ t('groups.home.createGroup') }}</span>
          </BaseButton>
        </div>
      </div>
    </section>

    <section v-if="userGroups.length > 0" class="mb-9">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-2.5">
          <h2 class="text-2xl font-bold text-on-ghost m-0">
            {{ t('groups.home.yourGroups') }}
          </h2>
          <span
            class="text-on-ghost-muted bg-surface rounded-full text-sm font-semibold px-2.5 py-0.5"
            >{{ userGroups.length }}</span
          >
        </div>

        <div>
          <BaseLabel for="defaultGroup">Default Group</BaseLabel>
          <BaseSelect
            id="defaultGroup"
            v-model="defaultGroupId"
            :options="groupOptions"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <button
          v-for="(group, index) in userGroups"
          :key="group.id"
          class="group flex items-center w-full gap-2 p-3 sm:px-3.5 sm:py-3 rounded-xl bg-surface border border-surface-border shadow-input cursor-pointer text-left transition-hover hover:bg-surface-highlight disabled:opacity-50 [.active]:bg-action [.active]:border-action [.active]:hover:bg-action-hover animate-fade-up"
          :style="{ animationDelay: `${index * 0.075}s`, animationFillMode: 'both' }"
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
            <div class="flex items-center gap-1.5 overflow-hidden">
              <span
                class="font-semibold text-base text-on-ghost group-[.active]:text-on-action truncate"
              >
                {{ group.name }}
              </span>
              <NotificationDot v-if="group.hasUnreadContent" />
            </div>
            <span
              class="text-xs font-semibold uppercase tracking-wider"
              :class="roleColors[group.role]"
            >
              {{ roleLabel(group.role) }}
            </span>
          </span>

          <!-- ChevronRight :size="16" class="transition duration-150 ease-in-out opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100 text-on-ghost-muted group-[.active]:text-on-action-muted" / -->

          <BaseButton
            @click.stop="openMenuId = openMenuId === group.id ? null : group.id"
            variant="ghost"
            :on="group.id === activeGroupId ? 'action' : 'surface'"
            :icon="MoreHorizontal"
          />

          <BaseMenu
            v-if="openMenuId === group.id"
            class="right-0 mt-6"
            @click.stop
          >
            <BaseMenuButton
              v-if="group.id !== defaultGroupId"
              :icon="Star"
              @click="setDefaultGroup(group.id)"
            >
              Make default
            </BaseMenuButton>

            <BaseMenuDivider v-if="group.id !== defaultGroupId" />

            <BaseMenuButton :icon="LogOut" @click="leaveGroup(group)">
              Leave
            </BaseMenuButton>
          </BaseMenu>
        </button>
      </div>
    </section>

    <!-- Empty State -->
    <section v-if="userGroups.length === 0 && !loading">
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
      <BaseSpinner size="32px" />
    </div>
  </div>
</template>
