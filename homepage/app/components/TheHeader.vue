<script setup lang="ts">
import { ref, computed } from 'vue';
import { Menu, X } from '@lucide/vue';
import { useWindowScroll } from '@vueuse/core';

const { t } = useI18n();
const config = useRuntimeConfig();
const mobileOpen = ref(false);

const { y: scrollY } = useWindowScroll();
const isScrolled = computed(() => scrollY.value > 20);

const navLinks = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.about', to: '/about' },
  { key: 'nav.contact', to: '/contact' },
] as const;
</script>

<template>
  <header class="w-full transition-all duration-200 ease-out"
    :class="[
      'bg-onyx/[0.82] backdrop-blur-[14px] -webkit-backdrop-blur-[14px] border-b border-transparent',
      isScrolled && 'bg-onyx/[0.96] border-canvas-border shadow-[0_1px_16px_rgba(0,0,0,0.12)]',
    ]"
    :style="{
      '--tw-bg-opacity': isScrolled ? '0.96' : '0.82',
    }"
  >
    <div class="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-2">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2.5 no-underline flex-shrink-0 mr-2" :aria-label="'schul-dashboard – ' + t('nav.home')">
        <img src="/favicon.svg" alt="Icon" class="w-full h-[30px]"/>
        <span class="font-bold text-[1.35rem] leading-none font-display text-on-surface whitespace-nowrap">schul-dashboard</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden sm:flex items-center gap-0.5 flex-1" aria-label="Main navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="px-3 py-1.5 rounded-md text-btn font-medium text-on-surface-muted no-underline transition-colors hover:text-on-surface hover:bg-surface-hover-subtle whitespace-nowrap"
          active-class="text-on-surface bg-surface-hover-subtle"
        >
          {{ t(link.key) }}
        </NuxtLink>
      </nav>

      <!-- Login CTA -->
      <a
        v-if="config.public.loginUrl"
        :href="config.public.loginUrl"
        class="hidden sm:inline-flex items-center px-[18px] py-[7px] rounded-md text-btn font-semibold bg-action text-on-action no-underline whitespace-nowrap flex-shrink-0 transition-all hover:bg-action-hover hover:translate-y-[-1px]"
        rel="noopener"
      >
        {{ t('nav.login') }}
      </a>

      <!-- Mobile toggle -->
      <button
        class="sm:hidden flex items-center justify-center p-1.5 ml-auto bg-none border-none cursor-pointer text-on-surface rounded-md transition-colors hover:bg-surface-hover-subtle"
        :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <X v-if="mobileOpen" :size="22" />
        <Menu v-else :size="22" />
      </button>
    </div>

    <!-- Mobile drawer -->
    <Transition name="slide-down">
      <div v-if="mobileOpen" class="sm:hidden flex flex-col border-t border-canvas-border px-4 pb-4 gap-0.5 bg-canvas" role="navigation" aria-label="Mobile navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="block px-3 py-2.5 rounded-md text-body font-medium text-on-surface-muted no-underline transition-colors hover:text-on-surface hover:bg-surface-hover-subtle"
          active-class="text-on-surface bg-surface-hover-subtle"
          @click="mobileOpen = false"
        >
          {{ t(link.key) }}
        </NuxtLink>
        <a
          v-if="config.public.loginUrl"
          :href="config.public.loginUrl"
          class="block mt-2 px-3 py-2.5 rounded-md text-body font-semibold bg-action text-on-action no-underline text-center transition-colors hover:bg-action-hover"
          rel="noopener"
          @click="mobileOpen = false"
        >
          {{ t('nav.login') }}
        </a>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
/* ── Transition ──────────────────────────────────────────── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Light mode overrides */
:global(:root.light) header {
  background-color: rgba(255, 255, 255, 0.84);
}

:global(:root.light) header.bg-onyx\/\[0\.96\] {
  background-color: rgba(255, 255, 255, 0.97);
  box-shadow: 0 1px 12px rgba(0, 0, 0, 0.07);
}
</style>
