<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import Logo from "@/common/components/Logo.vue";

// --- Scroll & Resize Logic ---
const scrollY = ref(0);
const isLargeScreen = ref(false);

const updateScroll = () => {
  scrollY.value = window.scrollY;
};

const updateWidth = () => {
  isLargeScreen.value = window.innerWidth >= 1200;
};

onMounted(() => {
  updateScroll();
  updateWidth();
  window.addEventListener('scroll', updateScroll);
  window.addEventListener('resize', updateWidth);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateScroll);
  window.removeEventListener('resize', updateWidth);
});

const announcementStyle = computed(() => {
  const limit = isLargeScreen.value ? 1000 : 600;
  const offset = Math.max(0, scrollY.value - limit);

  return {
    position: 'sticky' as const,
    top: '0',
    zIndex: '100',
    marginTop: `-${offset}px`
  };
});
</script>

<template>
  <header class="header">
    <div class="header-content-wrapper">
      <RouterLink to="/" class="logo-container">
        <Logo class="logo-img" aria-label="Website Logo"/>
        <span class="logo-text">schul-dashboard</span>
      </RouterLink>
    </div>
  </header>
  <div class="example-announcement" :style="announcementStyle">
    <span>Chemie fällt morgen aus</span>
  </div>
</template>

<style scoped>
.header {
  width: 100%;
  padding: 12px;
  background-color: var(--bg-canvas);
  color: var(--text-default);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border-canvas);
  /* CHANGED: Added position and z-index to stay above the announcement */
  position: relative;
  z-index: 101;
}

.header-content-wrapper {
  width: 100%;
  max-width: 1400px;
  height: 100%;
  display: flex;
  justify-content: left;
  align-items: center;
  padding: 0;
  box-sizing: border-box;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-img {
  height: 32px;
  width: auto;
}

.logo-text {
  font-weight: bold;
  font-size: 1.6rem;
  white-space: nowrap;
  line-height: 32px;
  font-family: var(--display-font), sans-serif;
  color: var(--text-default);
}

.example-announcement {
  background: var(--bg-surface);
  border-block: 1px solid var(--border-surface);
  padding: 10px 12px;
  border-radius: 0;
  font-family: var(--normal-font), sans-serif;
  font-size: 16px;
  text-align: center;
}

/*.nav-links {
  display: flex;
  gap: 24px;
}

.nav-item {
  text-decoration: none;
  color: #cccccc;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-item:hover {
  color: #ffffff;
}*/

@media (max-width: 368px) {
  .logo-text {
    font-size: var(--font-size-h2);
    line-height: 26px;
  }

  .logo-img {
    height: 26px;
  }
}
</style>