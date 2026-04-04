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
    } catch {}
    await router.push('/home');
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
    } catch {}
    await router.push('/home');
  });
});
</script>

<template>
  <div class="flex w-full items-center justify-center">
    <div class="w-full max-w-[420px]">
      <div class="text-center mb-8">
        <BaseHeading :level="1">
          {{ t('account.auth.login') }}
        </BaseHeading>
        <p class="text-sub text-on-surface-muted mt-2">
          {{
            t('account.auth.loginDescription', { defaultValue: 'Welcome back' })
          }}
        </p>
      </div>

      <BaseForm :submit="handleSubmit" :loading="submitting" class="mb-6">
        <template #content>
          <BaseFormGroup id="login-email" :error="errors.email">
            <BaseLabel for="login-email">
              {{ t('account.auth.email') }}
            </BaseLabel>
            <BaseInput
              id="login-email"
              ref="emailInputRef"
              v-model="email"
              :placeholder="t('account.auth.emailPlaceholder')"
              type="email"
              autocomplete="email"
              required
              @input="clearFieldError('email')"
              :aria-describedby="errors.email ? 'login-email-error' : undefined"
            />
          </BaseFormGroup>

          <BaseFormGroup id="login-password" :error="errors.password">
            <BaseLabel for="login-password">
              {{ t('account.auth.password') }}
            </BaseLabel>
            <BaseInput
              id="login-password"
              v-model="password"
              :placeholder="t('account.auth.passwordPlaceholder')"
              type="password"
              autocomplete="current-password"
              required
              @input="clearFieldError('password')"
              :aria-describedby="
                errors.password ? 'login-password-error' : undefined
              "
            />
          </BaseFormGroup>

          <div class="flex justify-end">
            <BaseLink to="/forgot-password">
              {{ t('account.auth.forgot') }}
            </BaseLink>
          </div>

          <transition name="fade">
            <div
              v-if="message"
              class="text-sub p-3 rounded-md"
              :class="
                isError
                  ? 'bg-danger-surface text-danger'
                  : 'bg-success-surface text-success'
              "
            >
              {{ message }}
            </div>
          </transition>
        </template>

        <template #action-text>
          {{ t('account.auth.login') }}
        </template>
      </BaseForm>

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
          {{
            t('account.auth.noAccount', {
              defaultValue: "Don't have an account?",
            })
          }}
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
