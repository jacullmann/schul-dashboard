<script setup lang="ts">
import AuthForm from '@/modules/auth/components/AuthForm.vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { onMounted } from 'vue';

const { handleOAuthReturn } = useOAuth();

function handleLoggedIn() {
  const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
  window.location.href = appUrl;
}

onMounted(() => {
  handleOAuthReturn(handleLoggedIn);
});
</script>

<template>
  <div class="login-page-container">
    <div class="login-content">
      <div class="logo-section">
        <AppLogo class="login-logo" />
      </div>
      <AuthForm @logged-in="handleLoggedIn" />
    </div>
    <BaseToast />
    <CookieBanner />
  </div>
</template>

<style scoped>
.login-page-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-canvas) 0%, var(--color-surface) 100%);
  padding: 16px;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
  max-width: 500px;
}

.logo-section {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 16px;
}

.login-logo {
  height: 50px;
  width: auto;
}

@media (max-width: 600px) {
  .login-page-container {
    padding: 12px;
  }

  .login-content {
    gap: 24px;
  }
}
</style>
