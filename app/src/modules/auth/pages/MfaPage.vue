<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';

const router = useRouter();
const userStore = useUserStore();
const { checkAuthStatus, activeGroupId } = useAppAuth();

async function handleMfaVerified() {
  try {
    await checkAuthStatus();

    await userStore.fetchUser();
  } catch (error) {
    console.error('Fehler beim Laden des Users nach MFA:', error);
  }

  const target = activeGroupId.value
    ? `/groups/${activeGroupId.value}/dashboard`
    : '/groups';
  await router.push(target);
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
