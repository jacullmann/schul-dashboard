<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Construction } from '@lucide/vue';
import { useUserStore } from '@/stores/userStore';
import { useAccessStatusStore } from '@/stores/accessStatusStore';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useLogin } from '@/modules/auth/composables/useLogin';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { usePasskeySignIn } from '@/modules/auth/composables/usePasskeySignIn';
import { passkeyIcon } from '@/modules/auth/utils/passkeyIcon';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const userStore = useUserStore();
const accessStatus = useAccessStatusStore();
const { maintenance } = storeToRefs(accessStatus);
const { t } = useI18n();
const { initiateGoogleLogin } = useOAuth();
const { checkAuthStatus, homeRoute } = useAppAuth();

async function enterApp() {
  try {
    await checkAuthStatus();
    await userStore.fetchUser();
  } catch {
    // Login succeeded; navigate anyway and let the route guard re-sync.
  }
  await router.push(homeRoute.value);
}

const {
  email,
  password,
  submitting,
  formError,
  emailInputRef,
  errors,
  verificationResend,
  clearFieldError,
  submit: submitLogin,
  resendVerification,
} = useLogin(enterApp, async () => {
  await router.push({ name: 'verify-mfa' });
});

const {
  supported: passkeysSupported,
  signingIn: passkeySigningIn,
  signInWithPasskey,
} = usePasskeySignIn(enterApp);

async function handleSubmit() {
  await submitLogin();
}

function navigateToRegister() {
  void router.push({ name: 'register' });
}

onMounted(accessStatus.load);
</script>

<template>
  <div class="flex w-full items-center justify-center">
    <div class="w-full max-w-105">
      <div class="text-center mb-8">
        <h1 class="text-center!">
          {{ t('auth.login.login') }}
        </h1>
        <p class="text-sm text-on-ghost-muted mt-1!">
          {{
            t('auth.login.login_description', { defaultValue: 'Welcome back' })
          }}
        </p>
      </div>

      <!-- The form stays: superadmins sign in during maintenance to end it. -->
      <div
        v-if="maintenance"
        role="status"
        class="flex gap-3 mb-6 rounded-xl border border-ghost-border bg-surface shadow-input px-4 py-3"
      >
        <Construction
          :size="20"
          class="shrink-0 text-on-ghost-muted"
          aria-hidden="true"
        />
        <div>
          <strong class="block text-sm">
            {{ t('auth.access.maintenance.title') }}
          </strong>
          <p class="m-0! text-sm">
            {{ t('auth.access.maintenance.message') }}
          </p>
        </div>
      </div>

      <BaseForm
        :submit="handleSubmit"
        :loading="submitting"
        :error="formError"
        class="mb-4"
      >
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
              autocomplete="email webauthn"
              required
              :aria-describedby="errors.email ? 'login-email-error' : undefined"
              @input="clearFieldError('email')"
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
              :aria-describedby="
                errors.password ? 'login-password-error' : undefined
              "
              @input="clearFieldError('password')"
            />
          </BaseFormGroup>

          <div class="flex justify-end">
            <BaseLink :to="{ name: 'forgot-password' }">
              {{ t('auth.login.forgot') }}
            </BaseLink>
          </div>

          <!-- A confirmation link can land in spam or expire unused; without
               a new one, the account could not be used at all. -->
          <BaseButton
            v-if="
              verificationResend === 'available' ||
              verificationResend === 'sending'
            "
            type="button"
            full
            :loading="verificationResend === 'sending'"
            @click="resendVerification"
          >
            {{ t('auth.login.verify_email.resend') }}
          </BaseButton>
        </template>

        <template #action-text>
          {{ t('auth.login.login') }}
        </template>
      </BaseForm>

      <div class="flex items-center gap-3 mb-4">
        <div class="flex-1 h-px bg-ghost-border" />
        <span class="text-xs text-on-ghost-muted">
          {{ t('auth.login.or_continue_with') }}
        </span>
        <div class="flex-1 h-px bg-ghost-border" />
      </div>
      <BaseButton
        type="button"
        surface
        variant="ghost"
        class="w-full justify-center pl-5"
        :icon="GoogleIcon"
        @click="initiateGoogleLogin"
      >
        {{ t('auth.login.login_google') }}
      </BaseButton>
      <template v-if="passkeysSupported">
        <BaseButton
          type="button"
          surface
          variant="ghost"
          class="w-full justify-center pl-5 mt-2"
          :icon="passkeyIcon"
          :loading="passkeySigningIn"
          :disabled="passkeySigningIn"
          @click="signInWithPasskey"
        >
          {{ t('auth.passkeys.sign_in') }}
        </BaseButton>
      </template>
      <div class="text-center mt-8">
        <p class="text-sm text-on-ghost-muted">
          {{
            t('auth.login.no_account', {
              defaultValue: "Don't have an account?",
            })
          }}
          <button
            type="button"
            class="text-on-ghost font-medium hover:opacity-75 transition-opacity cursor-pointer"
            @click="navigateToRegister"
          >
            {{ t('auth.login.register') }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>
