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
import { useElementBounding } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';

const { activeGroupId } = useAppAuth();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const isMobile = useIsMobileViewport();

useAppShortcuts();

const topBarSlot = useTemplateRef('topBarSlot');
const { left: topBarLeft, width: topBarWidth } = useElementBounding(
  topBarSlot,
  { windowScroll: false },
);
const topBarStyle = computed(() => ({
  left: `${topBarLeft.value}px`,
  width: `${topBarWidth.value}px`,
}));
</script>

<template>
  <div class="flex min-h-dvh w-full">
    <AppSidebar v-if="user && !isMobile" />

    <div class="flex-1 min-w-0 flex flex-col bg-canvas">
      <!-- Fixed rather than sticky: while Safari rubber-bands past the end of
           the page, WebKit detaches the backing store of any composited layer
           it deems off-screen, which makes a sticky header vanish outright.
           Only fixed layers are exempt. The slot keeps the bar's place in the
           flow and follows the sidebar's width. -->
      <div
        class="fixed top-0 z-(--z-header) flex flex-col"
        :style="topBarStyle"
      >
        <AppHeader />
        <Announcements v-if="activeGroupId" />
      </div>
      <div
        ref="topBarSlot"
        class="shrink-0 h-[calc(var(--header-height)+var(--announcement-height))] transition-[height] duration-500 ease-out"
      ></div>

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
