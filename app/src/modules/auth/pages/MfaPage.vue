<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';

const router = useRouter();
const userStore = useUserStore();
const { checkAuthStatus } = useAppAuth();

async function handleMfaVerified() {
  try {
    await checkAuthStatus();

    await userStore.fetchUser();
  } catch (error) {
    console.error('Fehler beim Laden des Users nach MFA:', error);
  }

  await router.push('/home');
}

async function handleMfaCancelled() {
  await router.push('/login');
}
</script>

<template>
  <div class="flex items-center justify-center px-4 py-6">
    <MfaVerifyModal
      @verified="handleMfaVerified"
      @cancelled="handleMfaCancelled"
    />
  </div>
</template>
