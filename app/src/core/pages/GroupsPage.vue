<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { UserRoundPlus, Plus, Folder, FolderOpen, UsersRound, Star, StarOff, LogOut } from '@lucide/vue';
import hw from '@/api/hwApi';
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const userStore = useUserStore();
const modalStore = useModalStore();
const { user } = storeToRefs(userStore);
const { activeGroupId, userGroups, switchActiveGroup } = useAppAuth();

const loading = ref(false);
const navigatingGroupId = ref<string | null>(null);

const isSuperadmin = computed(() => user.value?.role === 'superadmin');
const defaultGroupId = computed(() => user.value?.preferences?.defaultGroupId || null);

const roleColors: Record<string, string> = {
  admin: 'text-[#6366f1]',
  moderator: 'text-[#f59e0b]',
  user: 'text-on-surface-muted',
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

async function setDefaultGroup(groupId: string, event: Event) {
  event.stopPropagation();
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

async function leaveGroup(group: any, event: Event) {
  event.stopPropagation();
  if (group.ownerId === user.value?.id) {
    alert('The owner cannot leave the group. Transfer ownership or delete the group instead.');
    return;
  }
  if (!confirm(`Are you sure you want to leave the group "${group.name}"?`)) return;
  
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
      <div class="flex justify-between items-start gap-4 sm:gap-6 max-sm:flex-col">
        <div>
          <h1 class="text-2xl sm:text-[1.75rem] font-bold text-on-surface mb-1.5 leading-tight">Groups Management</h1>
          <p class="text-body text-on-surface-muted m-0 leading-relaxed">Manage your groups, leave or set a default group.</p>
        </div>

        <div class="flex gap-2 shrink-0 max-sm:w-full max-sm:flex-wrap [&>.btn]:max-sm:flex-1 [&>.btn]:max-sm:justify-center [&>.btn]:max-sm:min-w-0" v-if="userGroups.length > 0">
          <BaseButton @click="modalStore.openJoinGroup" variant="action">
            <UserRoundPlus :size="16" />
            <span>{{ t('groups.home.joinGroup') }}</span>
          </BaseButton>
          <BaseButton @click="modalStore.openCreateGroup" variant="ghost">
            <Plus :size="16" />
            <span>{{ t('groups.home.createGroup') }}</span>
          </BaseButton>
        </div>
      </div>
    </section>

    <section v-if="userGroups.length > 0" class="mb-9">
      <div class="flex items-center gap-2.5 mb-4">
        <h2 class="text-h2 font-bold text-on-surface m-0">{{ t('groups.home.yourGroups') }}</h2>
        <span class="text-on-surface-muted bg-surface rounded-full text-sub font-semibold px-2.5 py-0.5">{{ userGroups.length }}</span>
      </div>
      <div class="flex flex-col gap-2">
        <div
            v-for="group in userGroups"
            :key="group.id"
            class="group flex items-center w-full gap-2 p-3 sm:px-3.5 sm:py-3 rounded-xl bg-surface border border-surface-border shadow-input transition-hover hover:bg-surface-hover-subtle cursor-default [.active]:bg-action [.active]:border-action [.active]:hover:bg-action-hover"
            :class="{ active: group.id === activeGroupId }"
        >
          <span class="text-on-surface-muted group-[.active]:text-on-action flex items-center justify-center size-9 sm:size-10 shrink-0 transition-hover group-hover:text-on-surface cursor-pointer" @click="navigateToGroup(group.id)">
            <component :is="group.id === activeGroupId ? FolderOpen : Folder" :size="24" />
          </span>
          <span class="flex flex-col flex-1 gap-0.5 cursor-pointer" @click="navigateToGroup(group.id)">
            <div class="flex items-center gap-1.5 overflow-hidden">
              <span class="font-semibold text-body text-on-surface group-[.active]:text-on-action truncate">
                {{ group.name }}
              </span>
            </div>
            <span class="text-footnote font-semibold uppercase tracking-wider" :class="roleColors[group.role]">
              {{ roleLabel(group.role) }}
            </span>
          </span>

          <div class="flex items-center gap-2">
            <button 
              @click="(e) => setDefaultGroup(group.id, e)"
              class="p-2 rounded-lg text-on-surface-muted hover:text-action hover:bg-surface-hover transition-colors"
              :class="{ 'text-action': defaultGroupId === group.id }"
              :title="defaultGroupId === group.id ? 'Default Group' : 'Set as Default Group'"
            >
              <component :is="defaultGroupId === group.id ? Star : StarOff" :size="20" />
            </button>
            
            <button 
              v-if="group.ownerId !== user?.id && !isSuperadmin"
              @click="(e) => leaveGroup(group, e)"
              class="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
              title="Leave Group"
            >
              <LogOut :size="20" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Empty State -->
    <section v-if="!isSuperadmin && userGroups.length === 0 && !loading">
      <BaseEmptyState :icon="UsersRound" :primary-action="() => modalStore.openJoinGroup()" :secondary-action="() => modalStore.openCreateGroup()">
        <template #title>{{ t('groups.home.noGroups') }}</template>
        <template #message>{{ t('groups.home.joinGroupText') }}</template>
        <template #primary-action-label>{{ t('groups.home.joinGroup') }}</template>
        <template #secondary-action-label>{{ t('groups.home.createGroup') }}</template>
      </BaseEmptyState>
    </section>

    <div v-if="loading" class="flex justify-center p-10">
      <div class="w-7 h-7 border-2 border-canvas-border border-t-on-surface rounded-full animate-spin"></div>
    </div>
  </div>
</template>