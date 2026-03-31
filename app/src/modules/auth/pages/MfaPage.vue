<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';

const router = useRouter();
const userStore = useUserStore();

async function handleMfaVerified() {
  try {
    await userStore.fetchUser();
  } catch {
  }
  await router.push('/home');
}

async function handleMfaCancelled() {
  await router.push('/login');
}
</script>

<template>
  <div class="flex items-center justify-center px-4 py-6">
    <MfaVerifyModal @verified="handleMfaVerified" @cancelled="handleMfaCancelled" />
  </div>
</template>
