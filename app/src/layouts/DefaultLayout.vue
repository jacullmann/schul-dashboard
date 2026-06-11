<script setup lang="ts">
import { useAppShortcuts } from '@/core/composables/useAppShortcuts';
import AppHeader from '@/core/components/AppHeader.vue';
import AppSidebar from '@/core/components/AppSidebar.vue';
import Announcements from '../modules/announcements/components/Announcements.vue';
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
      <Announcements v-if="activeGroupId" />

      <main class="full-c flex-1">
        <div
          key="content"
          :class="{ container: !$route.meta.fullWidth }"
          class="w-full"
        >
          <router-view v-slot="{ Component }">
            <component :is="Component" :key="activeGroupId || 'default'" />
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>
