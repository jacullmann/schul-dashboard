<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useLogin } from '@/modules/auth/composables/useLogin';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useI18n } from 'vue-i18n';
import { onMounted } from 'vue';

const router = useRouter();
const userStore = useUserStore();
const { t } = useI18n();
const { handleOAuthReturn } = useOAuth();
const { initiateGoogleLogin } = useOAuth();
const { checkAuthStatus } = useAppAuth();

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
      await checkAuthStatus();
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
      await checkAuthStatus();
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
        <h1 class="text-center!">
          {{ t('auth.login.login') }}
        </h1>
        <p class="text-sm text-on-ghost-muted mt-2">
          {{
            t('auth.login.login_description', { defaultValue: 'Welcome back' })
          }}
        </p>
      </div>

      <BaseForm :submit="handleSubmit" :loading="submitting" class="mb-6">
        <template #content>
          <BaseFormGroup id="login-email" :error="errors.email">
            <BaseLabel for="login-email">
              {{ t('auth.login.email') }}
            </BaseLabel>
            <BaseInput
              id="login-email"
              ref="emailInputRef"
              v-model="email"
              :placeholder="t('auth.login.email_placeholder')"
              type="email"
              autocomplete="email"
              required
              @input="clearFieldError('email')"
              :aria-describedby="errors.email ? 'login-email-error' : undefined"
            />
          </BaseFormGroup>

          <BaseFormGroup id="login-password" :error="errors.password">
            <BaseLabel for="login-password">
              {{ t('auth.login.password') }}
            </BaseLabel>
            <BaseInput
              id="login-password"
              v-model="password"
              :placeholder="t('auth.login.password_placeholder')"
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
              {{ t('auth.login.forgot') }}
            </BaseLink>
          </div>

          <Transition
            enter-active-class="transition-opacity duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="message"
              class="text-sm p-3 rounded-md"
              :class="
                isError
                  ? 'bg-danger-hover text-danger'
                  : 'bg-success-hover text-success'
              "
            >
              {{ message }}
            </div>
          </Transition>
        </template>

        <template #action-text>
          {{ t('auth.login.login') }}
        </template>
      </BaseForm>

      <div class="flex items-center gap-3 mb-6">
        <div class="flex-1 h-px bg-canvas-border" />
        <span class="text-xs text-on-ghost-muted">
          {{ t('auth.login.or_continue_with') }}
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
        <span>{{ t('auth.login.login_google') }}</span>
      </BaseButton>
      <div class="text-center mt-8">
        <p class="text-sm text-on-ghost-muted">
          {{
            t('auth.login.no_account', {
              defaultValue: "Don't have an account?",
            })
          }}
          <button
            type="button"
            @click="navigateToRegister"
            class="text-on-ghost font-medium hover:opacity-75 transition-opacity cursor-pointer"
          >
            {{ t('auth.login.register') }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>
