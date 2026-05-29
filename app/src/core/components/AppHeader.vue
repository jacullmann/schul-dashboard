<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AppLogo from '@/common/components/AppLogo.vue';
import { Menu, ChevronDown, Plus, LogOut } from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';
import Avatar from '@/modules/auth/components/Avatar.vue';
import hw from '../../api/api';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const {
  groupName,
  userGroups,
  activeGroupId,
  switchActiveGroup,
  activeGroupAvatarUrl,
  activeGroupOwnerId,
} = useAppAuth();
const router = useRouter();
const route = useRoute();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);

function toggleExpanded() {
  modalStore.toggleSidebar();
}

const groupMenuOpen = ref(false);
const groupMenuRef = ref<HTMLElement | null>(null);

const logoLink = computed(() => '/groups');

function toggleGroupMenu() {
  groupMenuOpen.value = !groupMenuOpen.value;
}

async function onSwitchGroup(id: string) {
  groupMenuOpen.value = false;
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

onClickOutside(groupMenuRef, () => {
  groupMenuOpen.value = false;
});

const loading = ref(false);

async function leaveGroup() {
  if (!activeGroupId.value) return;

  const isConfirmed = await modalStore.confirm({
    title: 'Leave Group?',
    content: `Are you sure you want to leave the group "${groupName.value}"?`,
    submitText: 'Leave',
    danger: true,
  });

  if (activeGroupOwnerId.value === user.value?.id) {
    alert(
      'The owner cannot leave the group. Transfer ownership or delete the group instead.',
    );
    return;
  }
  if (!isConfirmed) return;

  loading.value = true;
  try {
    await hw.delete(`/groups/${activeGroupId.value}/leave`);
    window.location.reload();
  } catch (err) {
    console.error('Failed to leave group:', err);
    alert('Failed to leave group.');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!userStore.initialized) {
    userStore.fetchUser();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <header
    class="sticky flex w-full justify-center items-center bg-canvas text-on-ghost border-b border-canvas-border font-display p-0 top-0 h-(--header-height) z-(--z-header)"
  >
    <div class="relative h-full w-full flex items-center gap-4 px-4 max-w-325">
      <BaseButton
        class="md:hidden -ml-1"
        variant="ghost"
        on="ghost"
        @click="toggleExpanded"
        :aria-expanded="isExpanded"
        aria-label="Toggle navigation menu"
        :icon="Menu"
      />

      <router-link :to="logoLink" class="logo-group hidden! !md:flex">
        <AppLogo class="logo-img" aria-hidden="true" />
      </router-link>
      <router-link
        :to="logoLink"
        v-if="!(activeGroupId && groupName)"
        class="logo-group"
      >
        <span class="logo-text">schul-dashboard</span>
      </router-link>
      <div
        v-if="activeGroupId && groupName"
        class="relative flex items-center"
        ref="groupMenuRef"
      >
        <button
          class="flex items-center gap-2 group cursor-pointer hover:bg-ghost-hover transition-hover rounded-full -m-1 p-1"
          v-wave
          @click="toggleGroupMenu"
        >
          <Avatar :name="groupName" :picture="activeGroupAvatarUrl" :size="8" />

          <span class="logo-text leading-8">{{ groupName }}</span>
          <ChevronDown
            :size="16"
            class="transform transition-transform duration-200 ease-in-out text-on-ghost-muted group-hover:text-on-ghost transition-hover mr-2"
            :class="groupMenuOpen ? 'rotate-180' : ''"
          />
        </button>

        <BaseMenu
          :open="groupMenuOpen"
          @close="groupMenuOpen = false"
          class="top-full mt-1 left-0"
        >
          <BaseMenuButton
            v-for="g in userGroups"
            :key="g.id"
            :isSelect="true"
            :active="g.id === activeGroupId"
            @click="onSwitchGroup(g.id)"
          >
            <span>{{ g.name }}</span>
            <NotificationDot
              v-if="g.hasUnreadContent && g.id !== activeGroupId"
              class="ml-2"
            />
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            @click="
              groupMenuOpen = false;
              modalStore.openCreateGroup();
            "
            :icon="Plus"
          >
            New group
          </BaseMenuButton>

          <BaseMenuButton
            @click="leaveGroup"
            :icon="LogOut"
            variant="danger"
            :disabled="loading"
          >
            Leave group
          </BaseMenuButton>
        </BaseMenu>
      </div>
    </div>
  </header>
</template>

<style scoped>
.logo-group {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 0.6rem;
  color: var(--color-on-ghost);
  flex: 0 1 auto;
  line-height: 1;
}

.logo-img {
  width: auto;
  height: 32px;
}

.logo-text {
  font-size: var(--text-2xl);
  font-weight: 700;
  transition: opacity 0.2s ease;
}

@media (max-width: 1000px) {
  .logo-img {
    height: 26px;
  }
  .logo-text {
    font-size: var(--text-2xl);
  }
}

@media (max-width: 386px) {
  .logo-text {
    font-size: var(--text-xl);
  }
}
@media (max-width: 356px) {
  .logo-text {
    font-size: var(--text-lg);
  }
}
@media (max-width: 332px) {
  .logo-text {
    font-size: var(--text-base);
  }
}
</style>
