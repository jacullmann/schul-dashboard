<script setup lang="ts">
import { ref } from 'vue';
import { Menu, X } from '@lucide/vue';

const { t } = useI18n();
const config = useRuntimeConfig();
const mobileOpen = ref(false);

const navLinks = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.about', to: '/about' },
  { key: 'nav.contact', to: '/contact' },
];
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <!-- Logo -->
      <NuxtLink to="/" class="logo-link" :aria-label="'schul-dashboard – ' + t('nav.home')">
        <AppLogo class="logo-img" />
        <span class="logo-text">schul-dashboard</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="desktop-nav" aria-label="Main navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="nav-link"
          active-class="nav-link--active"
        >
          {{ t(link.key) }}
        </NuxtLink>
      </nav>

      <!-- Login CTA -->
      <a
        v-if="config.public.loginUrl"
        :href="config.public.loginUrl"
        class="login-btn"
        rel="noopener"
      >
        {{ t('nav.login') }}
      </a>

      <!-- Mobile menu toggle -->
      <button
        class="mobile-toggle"
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
      <div v-if="mobileOpen" class="mobile-nav" role="navigation" aria-label="Mobile navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="mobile-nav-link"
          active-class="mobile-nav-link--active"
          @click="mobileOpen = false"
        >
          {{ t(link.key) }}
        </NuxtLink>
        <a
          v-if="config.public.loginUrl"
          :href="config.public.loginUrl"
          class="mobile-nav-link mobile-login"
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
.header {
  width: 100%;
  background-color: var(--color-canvas);
  border-bottom: 1px solid var(--color-canvas-border);
  box-sizing: border-box;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  margin-right: 8px;
}

.logo-img {
  height: 30px;
  width: auto;
}

.logo-text {
  font-weight: 700;
  font-size: 1.35rem;
  line-height: 1;
  font-family: var(--font-display), sans-serif;
  color: var(--color-on-surface);
  white-space: nowrap;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav-link {
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-btn);
  font-weight: 500;
  color: var(--color-on-surface-muted);
  text-decoration: none;
  transition: var(--transition-hover);
  white-space: nowrap;
}

.nav-link:hover,
.nav-link--active {
  color: var(--color-on-surface);
  background-color: var(--color-surface-hover-subtle);
}

.login-btn {
  display: inline-flex;
  align-items: center;
  padding: 7px 18px;
  border-radius: var(--radius-md);
  font-size: var(--text-btn);
  font-weight: 600;
  background-color: var(--color-action);
  color: var(--color-on-action);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color var(--duration-hover) var(--ease-hover);
}

.login-btn:hover {
  background-color: var(--color-action-hover);
}

.mobile-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  padding: 6px;
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-on-surface);
  border-radius: var(--radius-md);
  transition: var(--transition-hover);
}

.mobile-toggle:hover {
  background-color: var(--color-surface-hover-subtle);
}

.mobile-nav {
  display: none;
  flex-direction: column;
  border-top: 1px solid var(--color-canvas-border);
  padding: 8px 16px 16px;
  gap: 2px;
  background: var(--color-canvas);
}

.mobile-nav-link {
  display: block;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-on-surface-muted);
  text-decoration: none;
  transition: var(--transition-hover);
}

.mobile-nav-link:hover,
.mobile-nav-link--active {
  color: var(--color-on-surface);
  background-color: var(--color-surface-hover-subtle);
}

.mobile-login {
  margin-top: 8px;
  background-color: var(--color-action);
  color: var(--color-on-action);
  font-weight: 600;
  text-align: center;
}

.mobile-login:hover {
  background-color: var(--color-action-hover);
  color: var(--color-on-action);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .desktop-nav,
  .login-btn {
    display: none;
  }

  .mobile-toggle {
    display: flex;
  }

  .mobile-nav {
    display: flex;
  }
}

@media (max-width: 368px) {
  .logo-text { font-size: 1.1rem; }
  .logo-img { height: 26px; }
}
</style>
