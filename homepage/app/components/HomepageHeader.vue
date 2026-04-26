<script setup lang="ts">
import { Menu, X } from '@lucide/vue';

const { t } = useI18n();
const localePath = useLocalePath();
const config = useRuntimeConfig();
const mobileMenuOpen = ref(false);

const navLinks = [
  { labelKey: 'nav.features', route: 'features' },
  { labelKey: 'nav.product', route: 'product' },
  { labelKey: 'nav.about', route: 'about' },
  { labelKey: 'nav.contact', route: 'contact' },
];

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}
</script>

<template>
  <header class="sticky top-0 z-50 w-full bg-canvas">
    <nav
      class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 h-14 flex items-center justify-between"
      aria-label="Main navigation"
    >
      <div class="flex items-center gap-8">
        <NuxtLink
          :to="localePath('index')"
          class="inline-flex items-center gap-2.5 font-bold text-on-ghost font-display no-underline hover:opacity-80 transition-opacity flex-shrink-0"
          aria-label="schul-dashboard home"
        >
          <img src="/favicon.svg" alt="" class="w-7 h-7" />
          <span class="hidden sm:inline text-sub">schul-dashboard</span>
        </NuxtLink>

        <div class="hidden lg:flex items-center gap-6">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.route"
            :to="localePath(link.route)"
            class="text-sub text-on-ghost-muted font-medium no-underline transition-colors hover:text-on-ghost"
            active-class="text-on-ghost"
          >
            {{ t(link.labelKey) }}
          </NuxtLink>
        </div>
      </div>

      <div class="hidden lg:flex items-center gap-3">
        <a
          :href="config.public.loginUrl || 'https://app.schul-dashboard.com'"
          class="text-sub text-on-ghost-muted font-medium transition-colors hover:text-on-ghost"
        >
          {{ t('common.login') }}
        </a>
        <a
          :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
          class="px-4 py-2 rounded-lg bg-action text-on-action text-sub font-semibold no-underline transition-all hover:bg-action-hover inline-flex items-center"
        >
          {{ t('common.getStarted') }}
        </a>
      </div>

      <button
        type="button"
        class="lg:hidden p-2 rounded-lg border border-surface-border text-on-ghost-muted hover:text-on-ghost hover:bg-surface-highlight transition-colors"
        :aria-expanded="mobileMenuOpen"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <component :is="mobileMenuOpen ? X : Menu" :size="20" aria-hidden="true" />
      </button>
    </nav>

    <Transition name="slide-down">
      <div v-if="mobileMenuOpen" class="lg:hidden border-t border-surface-border bg-canvas">
        <div class="max-w-[1300px] w-full mx-auto px-4 py-3 flex flex-col gap-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.route"
            :to="localePath(link.route)"
            class="px-3 py-2.5 rounded-lg text-on-ghost text-sub font-medium no-underline transition-colors hover:bg-surface-highlight"
            @click="closeMobileMenu"
          >
            {{ t(link.labelKey) }}
          </NuxtLink>
          <div class="border-t border-surface-border my-2" />
          <a
            :href="config.public.loginUrl || 'https://app.schul-dashboard.com'"
            class="px-3 py-2.5 rounded-lg text-on-ghost-muted text-sub font-medium transition-colors hover:bg-surface-highlight"
          >
            {{ t('common.login') }}
          </a>
          <a
            :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
            class="px-3 py-2.5 rounded-lg bg-action text-on-action text-sub font-semibold transition-all hover:bg-action-hover text-center"
          >
            {{ t('common.getStarted') }}
          </a>
        </div>
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
  transform: translateY(-8px);
}
</style>
