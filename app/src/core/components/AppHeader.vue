<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AppLogo from '@/common/components/AppLogo.vue';
import { Menu, ChevronDown, Plus } from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';

const userStore = useUserStore();
const {
  groupName,
  userGroups,
  activeGroupId,
  switchActiveGroup,
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

const logoLink = computed(() => '/home');

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
        const newPath = route.path.replace(`/groups/${oldGroupId}`, `/groups/${id}`);
        await router.push(newPath);
        if (route.path === '/home') {
          await router.push(`/groups/${id}/items/all`);
        }
      } else {
        await router.push(`/groups/${id}/items/all`);
      }
    } else {
      console.error('Failed to switch group', res.error);
    }
  }
}

onClickOutside(groupMenuRef, () => {
  groupMenuOpen.value = false;
});

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
    class="sticky flex w-full justify-center items-center bg-canvas text-on-surface border-b border-canvas-border font-display p-0 top-0 h-(--header-height) z-(--z-header)"
  >
    <div class="relative h-full w-full flex items-center gap-4 px-4 max-w-325">
      <!-- Mobile sidebar toggle -->
      <button
        class="md:hidden relative p-2 -m-2 mr-0 text-on-surface bg-transparent rounded-md hover:bg-surface transition-hover"
        @click="toggleExpanded"
        :aria-expanded="isExpanded"
        aria-label="Toggle navigation menu"
      >
        <Menu :size="20" />
      </button>

      <!-- Brand logo (desktop) -->
      <router-link :to="logoLink" class="logo-group hidden! !md:flex">
        <AppLogo class="logo-img" aria-hidden="true" />
      </router-link>

      <!-- Brand name (when no active group) -->
      <router-link
        :to="logoLink"
        v-if="!(activeGroupId && groupName)"
        class="logo-group"
      >
        <span class="logo-text">schul-dashboard</span>
      </router-link>

      <!-- Group switcher dropdown -->
      <div
        v-if="activeGroupId && groupName"
        class="relative flex items-center"
        ref="groupMenuRef"
      >
        <button
          class="flex items-center gap-1 group cursor-pointer"
          @click="toggleGroupMenu"
          title="Change group"
        >
          <span class="logo-text">{{ groupName }}</span>
          <ChevronDown
            :size="16"
            class="transition-transform duration-200 ease-in-out text-on-surface-muted group-hover:text-on-surface transition-hover"
            :class="{ 'rotate-180': groupMenuOpen }"
          />
        </button>

        <BaseMenu v-if="groupMenuOpen" class="top-full mt-1 left-0">
          <BaseMenuButton
            v-for="g in userGroups"
            :key="g.id"
            :isSelect="true"
            :active="g.id === activeGroupId"
            @click="onSwitchGroup(g.id)"
          >
            <span>{{ g.name }}</span>
            <NotificationDot v-if="g.hasUnreadContent && g.id !== activeGroupId" />
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            @click="groupMenuOpen = false; router.push('/home')"
          >
            <Plus :size="16" />
            New group
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
  color: var(--color-on-surface);
  flex: 0 1 auto;
  line-height: 1;
}

.logo-img {
  width: auto;
  height: 32px;
}

.logo-text {
  font-size: var(--text-h2);
  font-weight: 700;
  transition: opacity 0.2s ease;
}

@media (max-width: 1000px) {
  .logo-img { height: 26px; }
  .logo-text { font-size: var(--text-h2); }
}

@media (max-width: 386px) { .logo-text { font-size: var(--text-h3); } }
@media (max-width: 356px) { .logo-text { font-size: var(--text-title); } }
@media (max-width: 332px) { .logo-text { font-size: var(--text-body); } }
</style>
