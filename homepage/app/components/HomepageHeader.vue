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
          <span class="hidden sm:inline text-sm">schul-dashboard</span>
        </NuxtLink>

        <div class="hidden lg:flex items-center gap-6">
          <BaseLink v-for="link in navLinks" :key="link.route" :to="localePath(link.route)">
            {{ t(link.labelKey) }}
          </BaseLink>
        </div>
      </div>

      <BaseRow class="hidden lg:flex">
        <BaseButton
          variant="ghost"
          :href="config.public.loginUrl || 'https://app.schul-dashboard.com'"
          target="_self"
        >
          {{ t('common.login') }}
        </BaseButton>
        <BaseButton
          variant="action"
          :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
          target="_self"
        >
          {{ t('common.getStarted') }}
        </BaseButton>
      </BaseRow>

      <BaseButton
        variant="ghost"
        class="lg:hidden"
        :aria-expanded="mobileMenuOpen"
        :icon="mobileMenuOpen ? X : Menu"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
      </BaseButton>
    </nav>

    <Transition name="slide-down">
      <div v-if="mobileMenuOpen" class="lg:hidden border-t border-surface-border bg-canvas">
        <div class="max-w-[1300px] w-full mx-auto px-4 py-3 flex flex-col gap-1">
          <BaseLink
            v-for="link in navLinks"
            :key="link.route"
            :to="localePath(link.route)"
            @click="closeMobileMenu"
          >
            {{ t(link.labelKey) }}
          </BaseLink>
          <div class="border-t border-surface-border my-2" />
          <BaseButton
            :href="config.public.loginUrl || 'https://app.schul-dashboard.com'"
            variant="ghost"
            class="w-full"
          >
            {{ t('common.login') }}
          </BaseButton>
          <BaseButton
            :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
            variant="action"
            class="w-full"
          >
            {{ t('common.getStarted') }}
          </BaseButton>
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
