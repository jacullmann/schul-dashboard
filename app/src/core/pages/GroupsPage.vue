<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { UserRoundPlus, Plus, Folder, UsersRound, LogOut } from '@lucide/vue';
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
          <BaseHeading :level="2">Groups Management</BaseHeading>
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
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-2.5">
          <h2 class="text-h2 font-bold text-on-surface m-0">{{ t('groups.home.yourGroups') }}</h2>
          <span class="text-on-surface-muted bg-surface rounded-full text-sub font-semibold px-2.5 py-0.5">{{ userGroups.length }}</span>
        </div>

        <div class="flex items-center gap-2">
          <label for="defaultGroup" class="text-sm font-medium text-on-surface-muted whitespace-nowrap">Default Group:</label>
          <select 
            id="defaultGroup" 
            class="bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-action"
            :value="defaultGroupId || ''"
            @change="(e) => setDefaultGroup((e.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Select a default group...</option>
            <option v-for="group in userGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div
            v-for="group in userGroups"
            :key="group.id"
            class="flex items-center justify-between w-full gap-4 p-4 rounded-xl bg-surface border border-surface-border shadow-sm"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <span class="text-on-surface-muted flex items-center justify-center size-10 shrink-0 bg-canvas rounded-lg">
              <Folder :size="20" />
            </span>
            <div class="flex flex-col gap-0.5 overflow-hidden">
              <span class="font-semibold text-body text-on-surface truncate">
                {{ group.name }}
              </span>
              <span class="text-footnote font-semibold uppercase tracking-wider" :class="roleColors[group.role]">
                {{ roleLabel(group.role) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <BaseButton
              @click="navigateToGroup(group.id)"
              variant="default"
            >
              Open
            </BaseButton>

            <BaseButton
              @click="leaveGroup(group)"
              variant="danger"
              class="max-sm:px-2 max-sm:py-1 max-sm:min-w-0"
              title="Leave Group"
            >
              <span class="sm:hidden"><LogOut :size="16" /></span>
              <span class="hidden sm:inline">Leave</span>
            </BaseButton>
          </div>        </div>
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