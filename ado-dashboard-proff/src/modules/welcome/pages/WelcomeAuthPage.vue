<template>
  <div class="split-screen">
    <div class="auth-section">
      <AuthForm @logged-in="onLoggedIn" />
    </div>
    <div class="bg-section">
      <img 
        v-if="isDesktop"
        src="@/public/background_landscape.webp" 
        alt="Background" 
        class="bg-image" 
        loading="lazy"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useMediaQuery } from '@vueuse/core';
import AuthForm from '@/modules/auth/components/AuthForm.vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const router = useRouter();
const { checkAuthStatus, activeGroupId } = useAppAuth();

const isDesktop = useMediaQuery('(min-width: 900px)');

async function onLoggedIn() {
  await checkAuthStatus();
  if (activeGroupId.value) {
    router.push('/items/HAUSAUFGABE');
  } else {
    router.push('/get-started');
  }
}
</script>

<style scoped>
.split-screen {
  display: flex;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  background: var(--bg);
  z-index: 1000; /* over the welcome layout header/footer */
}

.auth-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 32px;
  overflow-y: auto;
}

.bg-section {
  flex: 1;
  display: none;
  background-color: var(--border2);
  position: relative;
  overflow: hidden;
}

.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}

@media (min-width: 900px) {
  .auth-section {
    flex: 0 0 500px; /* Fixed width on desktop */
  }
  .bg-section {
    display: block; /* Show background on large screens */
  }
}
</style>