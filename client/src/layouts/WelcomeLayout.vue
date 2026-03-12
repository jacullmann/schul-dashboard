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
  box-shadow: var(--shadow-s);
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
</style>