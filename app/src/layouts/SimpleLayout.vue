<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useScroll } from '@vueuse/core';
import { PAGE_SECONDARY_ACTIONS_ID } from '@/common/components/BasePageActions.vue';

const scroller = useTemplateRef('scroller');
const { y: scrollY } = useScroll(scroller);
const isScrolled = computed(() => scrollY.value > 0);
</script>

<template>
  <div class="flex w-full flex-col bg-canvas max-md:h-dvh md:min-h-screen">
    <!-- On phones the page scrolls inside the layout instead of the document,
         so its edge cuts content off above a page's secondary actions, which
         BasePageActions moves out below it. -->
    <div
      ref="scroller"
      class="flex flex-1 flex-col max-md:min-h-0 max-md:overflow-x-hidden max-md:overflow-y-auto max-md:overscroll-contain"
    >
      <header class="relative z-10 w-full px-6 py-2 max-md:sticky max-md:top-0">
        <!-- Only shown once scrolled, like AppHeader's. -->
        <BaseScrollFade v-show="isScrolled" class="inset-0 -bottom-4" />
        <div class="flex items-center justify-center text-2xl font-bold">
          schul-dashboard
          <!-- TODO: implement theme and language switch -->
        </div>
      </header>
      <main
        class="flex flex-1 justify-center items-center p-6 main-content box-border"
      >
        <router-view />
      </main>
    </div>
    <div
      :id="PAGE_SECONDARY_ACTIONS_ID"
      class="md:hidden px-6 pb-[max(--spacing(6),env(safe-area-inset-bottom))] empty:hidden"
    ></div>
  </div>
</template>
