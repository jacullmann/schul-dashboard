<script setup lang="ts">
import { useRouter } from 'vue-router';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useRegister } from '@/modules/auth/composables/useRegister';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();
const { initiateGoogleLogin } = useOAuth();

const {
  email,
  password,
  passwordConfirm,
  acceptedPrivacy,
  submitting,
  message,
  isError,
  emailInputRef,
  errors,
  clearFieldError,
  submit: submitRegister,
} = useRegister(
  async () => {
    await router.push('/login');
  },
);

async function handleSubmit() {
  await submitRegister();
}

function navigateToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="flex items-center justify-center px-4 py-6">
    <div class="w-full max-w-[420px]">
      <!-- Title -->
      <div class="text-center mb-8">
        <h1 class="text-h2 font-semibold text-on-surface">
          {{ t('account.auth.register') }}
        </h1>
        <p class="text-sub text-on-surface-muted mt-2">
          {{ t('account.auth.registerDescription', { defaultValue: 'Create your account' }) }}
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4 mb-6" novalidate>
        <!-- Email Field -->
        <div>
          <label for="register-email" class="block text-body font-medium text-on-surface mb-2">
            {{ t('account.auth.email') }}
          </label>
          <div class="relative">
            <BaseInput
              id="register-email"
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

        <!-- Password Field -->
        <div>
          <label for="register-password" class="block text-body font-medium text-on-surface mb-2">
            {{ t('account.auth.password') }}
          </label>
          <div class="relative">
            <BaseInput
              id="register-password"
              v-model="password"
              :placeholder="t('account.auth.passwordPlaceholder')"
              type="password"
              autocomplete="new-password"
              required
              @input="clearFieldError('password')"
            />
          </div>
          <div v-if="errors.password" class="text-danger text-sub mt-1">
            {{ errors.password }}
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div>
          <label for="register-confirm" class="block text-body font-medium text-on-surface mb-2">
            {{ t('account.auth.confirmPassword') }}
          </label>
          <div class="relative">
            <BaseInput
              id="register-confirm"
              v-model="passwordConfirm"
              :placeholder="t('account.auth.confirmPlaceholder')"
              type="password"
              autocomplete="new-password"
              required
              @input="clearFieldError('passwordConfirm')"
            />
          </div>
          <div v-if="errors.passwordConfirm" class="text-danger text-sub mt-1">
            {{ errors.passwordConfirm }}
          </div>
        </div>

        <!-- Terms & Privacy Checkbox -->
        <div>
          <label class="flex items-start gap-2 cursor-pointer">
            <BaseCheckbox
              v-model="acceptedPrivacy"
              class="mt-1"
              @change="clearFieldError('privacy')"
            />
            <span class="text-sub text-on-surface">
              <i18n-t keypath="account.auth.terms">
                <template #privacy>
                  <a
                    href="/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-on-surface underline hover:opacity-75 transition-opacity"
                  >
                    {{ t('legal.privacy.title') }}
                  </a>
                </template>
                <template #terms>
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-on-surface underline hover:opacity-75 transition-opacity"
                  >
                    {{ t('legal.terms.title') }}
                  </a>
                </template>
              </i18n-t>
            </span>
          </label>
          <div v-if="errors.privacy" class="text-danger text-sub mt-1 ml-8">
            {{ errors.privacy }}
          </div>
        </div>

        <!-- Message Display -->
        <transition name="fade">
          <div
            v-if="message"
            class="text-sub p-3 rounded-md"
            :class="isError ? 'bg-danger-surface text-danger' : 'bg-success-surface text-success'"
          >
            {{ message }}
          </div>
        </transition>

        <!-- Submit Button -->
        <BaseButton
          type="submit"
          variant="action"
          :disabled="submitting"
          :loading="submitting"
          class="w-full justify-center"
        >
          {{ t('account.auth.register') }}
        </BaseButton>
      </form>

      <!-- OAuth Divider -->
      <div class="flex items-center gap-3 mb-6">
        <div class="flex-1 h-px bg-canvas-border" />
        <span class="text-footnote text-on-surface-muted">
          {{ t('account.auth.orContinueWith') }}
        </span>
        <div class="flex-1 h-px bg-canvas-border" />
      </div>

      <!-- Google Register -->
      <BaseButton
        type="button"
        variant="ghost"
        @click="initiateGoogleLogin"
        class="w-full justify-center"
      >
        <GoogleIcon :size="16" />
        <span>{{ t('account.auth.registerGoogle') }}</span>
      </BaseButton>

      <!-- Switch to Login -->
      <div class="text-center mt-8">
        <p class="text-sub text-on-surface-muted">
          {{ t('account.auth.haveAccount', { defaultValue: 'Already have an account?' }) }}
          <button
            type="button"
            @click="navigateToLogin"
            class="text-on-surface font-medium hover:opacity-75 transition-opacity cursor-pointer"
          >
            {{ t('account.auth.login') }}
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
