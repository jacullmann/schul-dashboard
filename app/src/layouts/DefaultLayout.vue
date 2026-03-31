<script setup lang="ts">
import { useAppShortcuts } from '@/core/composables/useAppShortcuts';
import AppHeader from '@/core/components/AppHeader.vue';
import AppFooter from '@/core/components/AppFooter.vue';
import AppSidebar from '@/core/components/AppSidebar.vue';
import GlobalAnnouncements from '@/modules/announcements/components/GlobalAnnouncements.vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';

const { activeGroupId } = useAppAuth();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

useAppShortcuts();

</script>

<template>
  <div class="flex min-h-screen w-full">
    <AppSidebar v-if="user" />

    <div class="flex-1 min-w-0 flex flex-col bg-canvas">
      <AppHeader />
      <GlobalAnnouncements v-if="activeGroupId" />

      <main class="full-c flex-1">
        <div
            :class="{ 'container': !$route.meta.fullWidth }"
            class="main-content"
            key="content"
        >
          <router-view v-slot="{ Component }">
            <component :is="Component" :key="activeGroupId || 'default'" />
          </router-view>
        </div>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>

.main-content {
  width: 100%;
}
</style>