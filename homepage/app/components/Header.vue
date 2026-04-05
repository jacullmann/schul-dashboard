<script setup lang="ts">
import { Menu, X } from '@lucide/vue';
import { ref, computed } from 'vue';
import { useWindowScroll } from '@vueuse/core';

const { t } = useI18n();
const localePath = useLocalePath();
const config = useRuntimeConfig();
const mobileMenuOpen = ref(false);

const { y: scrollY } = useWindowScroll();
const isScrolled = computed(() => scrollY.value > 20);

const navLinks = [
  { label: 'nav.features', route: 'features' },
  { label: 'nav.pricing', route: 'pricing' },
  { label: 'nav.about', route: 'about' },
  { label: 'nav.contact', route: 'contact' },
];

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full transition-all"
    :class="isScrolled
      ? 'bg-canvas/80 border-b border-canvas-border/50 backdrop-blur-md'
      : 'bg-canvas border-b border-transparent'
    "
  >
    <nav class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 py-4 flex items-center justify-between" aria-label="Main navigation">
      <!-- Logo -->
      <NuxtLink
        :to="localePath('index')"
        class="inline-flex items-center gap-2 font-bold text-on-surface font-display no-underline hover:opacity-80 transition-opacity"
        aria-label="schul-dashboard home"
      >
        <img src="/favicon.svg" alt="" class="w-8 h-8" />
        <span class="hidden sm:inline">schul-dashboard</span>
      </NuxtLink>

      <!-- Desktop Navigation -->
      <div class="hidden lg:flex items-center gap-8">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.route"
          :to="localePath(link.route)"
          class="text-on-surface-muted text-sm font-medium no-underline transition-colors hover:text-on-surface"
        >
          {{ t(link.label) }}
        </NuxtLink>
      </div>

      <!-- Right Side: Theme & Language Switches + CTA -->
      <div class="hidden lg:flex items-center gap-4">
        <div class="flex items-center gap-2 pl-4 border-l border-surface-border">
          <!-- TODO: Embed theme and language switches as inline buttons -->
          <NuxtLink
            :to="config.public.loginUrl || '#'"
            class="px-4 py-2 rounded-lg bg-action text-on-action text-sm font-semibold no-underline transition-all hover:bg-action-hover inline-flex items-center"
          >
            {{ t('common.login') }}
          </NuxtLink>
        </div>
      </div>

      <!-- Mobile Menu Toggle -->
      <button
        type="button"
        class="lg:hidden p-2 rounded-lg bg-surface border border-surface-border text-on-surface hover:bg-surface-hover transition-colors"
        @click="toggleMobileMenu"
        :aria-expanded="mobileMenuOpen"
        aria-label="Toggle menu"
      >
        <Menu v-if="!mobileMenuOpen" :size="20" aria-hidden="true" />
        <X v-else :size="20" aria-hidden="true" />
      </button>
    </nav>

    <!-- Mobile Menu -->
    <Transition name="slide-down">
      <div
        v-if="mobileMenuOpen"
        class="lg:hidden border-t border-surface-border bg-canvas"
        @click="closeMobileMenu"
      >
        <nav class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 py-4 flex flex-col gap-2" aria-label="Mobile navigation">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.route"
            :to="localePath(link.route)"
            class="px-3 py-2 rounded-lg text-on-surface text-sm font-medium no-underline transition-colors hover:bg-surface-hover-subtle"
          >
            {{ t(link.label) }}
          </NuxtLink>
          <NuxtLink
            :to="config.public.loginUrl || '#'"
            class="px-3 py-2 rounded-lg bg-action text-on-action text-sm font-semibold no-underline transition-all hover:bg-action-hover"
          >
            {{ t('common.login') }}
          </NuxtLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 200ms ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
