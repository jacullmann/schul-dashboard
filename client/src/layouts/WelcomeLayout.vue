<script setup lang="ts">
import WelcomeHeader from '@/modules/welcome/components/WelcomeHeader.vue';
import WelcomeFooter from '@/modules/welcome/components/WelcomeFooter.vue';
</script>

<template>
  <div class="outer-container">
    <div class="header-container">
      <WelcomeHeader />
    </div>

    <main class="full-c">
      <div class="bg"></div>
      <div class="hero-bg"></div>

      <div class="main-container">
        <router-view />
      </div>
    </main>

    <div class="footer-container">
      <WelcomeFooter />
    </div>
  </div>
</template>

<style scoped>
.outer-container {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background: transparent;
  display: flex;
  flex-direction: column;
}

.header-container {
  width: 100%;
  box-shadow: var(--menu-shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.footer-container {
  width: 100%;
  margin-top: auto;
}

.main-container {
  flex-grow: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
  flex-direction: column;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 95vh;
  background-image: url('/background_image_v2.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1;
  pointer-events: none;
}

@media (max-width: 1200px) {
  .hero-bg {
    display: none;
    max-height: 730px;
  }
}
</style>

<style>
:root.light .hero-bg,
:root.light-glass .hero-bg {
  display: none !important;
}
</style>