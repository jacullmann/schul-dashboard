<script setup lang="ts">
import { useAppShortcuts } from '@/core/composables/useAppShortcuts';
import AppHeader from '@/core/components/AppHeader.vue';
import AppSidebar from '@/core/components/AppSidebar.vue';
import AppTabBar from '@/core/components/AppTabBar.vue';
import Announcements from '../modules/announcements/components/Announcements.vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';
import { useIsMobileViewport } from '@/common/composables/useViewport';

const { activeGroupId } = useAppAuth();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const isMobile = useIsMobileViewport();

useAppShortcuts();
</script>

<template>
  <div class="flex min-h-screen w-full">
    <AppSidebar v-if="user && !isMobile" />

    <div class="flex-1 min-w-0 flex flex-col bg-canvas">
      <AppHeader />
      <Announcements v-if="activeGroupId" />

      <main class="full-c flex-1 overflow-x-clip pb-(--tab-bar-height)">
        <div
          key="content"
          :class="{ container: !$route.meta.fullWidth }"
          class="w-full"
        >
          <router-view v-slot="{ Component }">
            <!-- One page instance per group: group pages read their id once. -->
            <component
              :is="Component"
              :key="$route.params.groupId || 'default'"
            />
          </router-view>
        </div>
      </main>
    </div>

    <AppTabBar v-if="user" />
  </div>
</template>
