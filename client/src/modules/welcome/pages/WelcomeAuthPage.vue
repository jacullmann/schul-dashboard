<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMediaQuery } from '@vueuse/core';
import AuthForm from '@/modules/auth/components/AuthForm.vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { ArrowLeft } from '@lucide/vue';

const router = useRouter();
const { checkAuthStatus, activeGroupId } = useAppAuth();
const userStore = useUserStore();
const { t } = useI18n();

const isDesktop = useMediaQuery('(min-width: 900px)');

async function onLoggedIn() {
  await checkAuthStatus();
  await userStore.fetchUser();
  if (activeGroupId.value) {
    router.push(`/groups/${activeGroupId.value}/items/all`);
  } else {
    router.push('/home');
  }
}
</script>

<template>
  <div class="split-screen">
    <div class="auth-section">
      <button class="back-link" @click="router.push('/')">
        <ArrowLeft :size="20" />
        <span>{{ t('global.buttons.back') }}</span>
      </button>
      <AuthForm @logged-in="onLoggedIn" />
    </div>
    <div class="bg-section">
      <img 
        v-if="isDesktop"
        src="/background_landscape.webp" 
        alt="Background" 
        class="bg-image" 
        loading="lazy"
      />
    </div>
  </div>
</template>

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
  background: var(--color-canvas);
  z-index: 1000; /* over the welcome layout header/footer */
}

.auth-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow-y: auto;
  border-right: none;
  position: relative;
}

.back-link {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  font-size: var(--text-sub);
  font-weight: 500;
  transition: color 0.2s ease;
  padding: 8px;
}

.back-link:hover {
  color: var(--color-on-surface);
}

.bg-section {
  flex: 1;
  display: none;
  background-color: var(--color-surface-border);
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
    border-right: 1px solid var(--color-canvas-border);
  }
  .bg-section {
    display: block; /* Show background on large screens */
  }
}
</style>
