<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useLogin } from '@/modules/auth/composables/useLogin';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useI18n } from 'vue-i18n';
import { onMounted } from 'vue';

const router = useRouter();
const userStore = useUserStore();
const { t } = useI18n();
const { handleOAuthReturn } = useOAuth();
const { initiateGoogleLogin } = useOAuth();

const {
  email,
  password,
  submitting,
  message,
  isError,
  emailInputRef,
  errors,
  clearFieldError,
  submit: submitLogin,
} = useLogin(
  async () => {
    try {
      await userStore.fetchUser();
    } catch {
    }
    await router.push({ name: 'home' });
  },
  async () => {
    await router.push('/verify-mfa');
  },
);

async function handleSubmit() {
  await submitLogin();
}

function navigateToRegister() {
  router.push('/register');
}

onMounted(() => {
  handleOAuthReturn(async () => {
    try {
      await userStore.fetchUser();
    } catch {
      // Continue even if fetch fails
    }
    await router.push({ name: 'home' });
  });
});
</script>

<template>
  <div class="flex items-center justify-center px-4 py-6">
    <div class="w-full max-w-[420px]">
      <div class="text-center mb-8">
        <h1 class="text-h2 font-semibold text-on-surface">
          {{ t('account.auth.login') }}
        </h1>
        <p class="text-sub text-on-surface-muted mt-2">
          {{ t('account.auth.loginDescription', { defaultValue: 'Welcome back' }) }}
        </p>
      </div>
      <form @submit.prevent="handleSubmit" class="space-y-4 mb-6" novalidate>
        <div>
          <label for="login-email" class="block text-body font-medium text-on-surface mb-2">
            {{ t('account.auth.email') }}
          </label>
          <div class="relative">
            <BaseInput
              id="login-email"
              ref="emailInputRef"
              v-model="email"
              :placeholder="t('account.auth.emailPlaceholder')"
              type="email"
              autocomplete="email"
              required
              @input="clearFieldError('email')"
            />
          </div>
          <div v-if="errors.email" class="text-danger text-sub mt-1">
            {{ errors.email }}
          </div>
        </div>
        <div>
          <label for="login-password" class="block text-body font-medium text-on-surface mb-2">
            {{ t('account.auth.password') }}
          </label>
          <div class="relative">
            <BaseInput
              id="login-password"
              v-model="password"
              :placeholder="t('account.auth.passwordPlaceholder')"
              type="password"
              autocomplete="current-password"
              required
              @input="clearFieldError('password')"
            />
          </div>
          <div v-if="errors.password" class="text-danger text-sub mt-1">
            {{ errors.password }}
          </div>
        </div>
        <div class="flex justify-end">
          <router-link
            to="/forgot-password"
            class="text-sub text-on-surface-muted hover:text-on-surface transition-colors"
          >
            {{ t('account.auth.forgot') }}
          </router-link>
        </div>
        <transition name="fade">
          <div
            v-if="message"
            class="text-sub p-3 rounded-md"
            :class="isError ? 'bg-danger-surface text-danger' : 'bg-success-surface text-success'"
          >
            {{ message }}
          </div>
        </transition>
        <BaseButton
          type="submit"
          variant="action"
          :disabled="submitting"
          :loading="submitting"
          class="w-full justify-center"
        >
          {{ t('account.auth.login') }}
        </BaseButton>
      </form>
      <div class="flex items-center gap-3 mb-6">
        <div class="flex-1 h-px bg-canvas-border" />
        <span class="text-footnote text-on-surface-muted">
          {{ t('account.auth.orContinueWith') }}
        </span>
        <div class="flex-1 h-px bg-canvas-border" />
      </div>
      <BaseButton
        type="button"
        variant="ghost"
        @click="initiateGoogleLogin"
        class="w-full justify-center"
      >
        <GoogleIcon :size="16" />
        <span>{{ t('account.auth.loginGoogle') }}</span>
      </BaseButton>
      <div class="text-center mt-8">
        <p class="text-sub text-on-surface-muted">
          {{ t('account.auth.noAccount', { defaultValue: "Don't have an account?" }) }}
          <button
            type="button"
            @click="navigateToRegister"
            class="text-on-surface font-medium hover:opacity-75 transition-opacity cursor-pointer"
          >
            {{ t('account.auth.register') }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
