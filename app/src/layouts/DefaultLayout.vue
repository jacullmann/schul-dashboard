<script setup lang="ts">
import { useAppShortcuts } from '@/core/composables/useAppShortcuts';
import AppHeader from '@/core/components/AppHeader.vue';
import AppSidebar from '@/core/components/AppSidebar.vue';
import AppTabBar from '@/core/components/AppTabBar.vue';
import AnnouncementCard from '@/modules/announcements/components/AnnouncementCard.vue';
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';
import { useIsSidebarViewport } from '@/common/composables/useViewport';
import { useElementBounding } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const hasSidebar = useIsSidebarViewport();

useAppShortcuts();

const header = useTemplateRef('header');
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
    <AppSidebar v-if="user && hasSidebar" />

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
        <AppHeader ref="header" />
        <AnnouncementCard
          v-if="user"
          :collapse-target="header?.groupButton ?? null"
        />
      </div>
      <div ref="topBarSlot" class="shrink-0 h-(--header-height)"></div>

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
