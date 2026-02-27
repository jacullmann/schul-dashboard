<template>
  <div class="auth-content">
    <AuthForm />
  </div>
</template>

<script setup lang="ts">
import AuthForm from '@/modules/auth/components/AuthForm.vue';
</script>

<style scoped>
.auth-content {
  text-align: left;
  padding: 16px 0;
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>