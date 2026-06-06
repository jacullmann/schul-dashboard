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
} = useRegister(async () => {
  await router.push('/login');
});

async function handleSubmit() {
  await submitRegister();
}

function navigateToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="flex w-full items-center justify-center">
    <div class="w-full max-w-[420px]">
      <div class="text-center mb-8">
        <h1 class="text-center!">
          {{ t('auth.login.register') }}
        </h1>
        <p class="text-sm text-on-ghost-muted mt-2">
          {{
            t('auth.login.register_description', {
              defaultValue: 'Create your account',
            })
          }}
        </p>
      </div>

      <BaseForm :submit="handleSubmit" :loading="submitting" class="mb-6">
        <template #content>
          <BaseFormGroup id="register-email" :error="errors.email">
            <BaseLabel for="register-email">
              {{ t('auth.login.email') }}
            </BaseLabel>
            <BaseInput
              id="register-email"
              ref="emailInputRef"
              v-model="email"
              :placeholder="t('auth.login.email_placeholder')"
              type="email"
              autocomplete="email"
              required
              :aria-describedby="
                errors.email ? 'register-email-error' : undefined
              "
              @input="clearFieldError('email')"
            />
          </BaseFormGroup>

          <BaseFormGroup id="register-password" :error="errors.password">
            <BaseLabel for="register-password">
              {{ t('auth.login.password') }}
            </BaseLabel>
            <BaseInput
              id="register-password"
              v-model="password"
              :placeholder="t('auth.login.password_placeholder')"
              type="password"
              autocomplete="new-password"
              required
              :aria-describedby="
                errors.password ? 'register-password-error' : undefined
              "
              @input="clearFieldError('password')"
            />
          </BaseFormGroup>

          <BaseFormGroup id="register-confirm" :error="errors.passwordConfirm">
            <BaseLabel for="register-confirm">
              {{ t('auth.login.confirm_password') }}
            </BaseLabel>
            <BaseInput
              id="register-confirm"
              v-model="passwordConfirm"
              :placeholder="t('auth.login.confirm_placeholder')"
              type="password"
              autocomplete="new-password"
              required
              :aria-describedby="
                errors.passwordConfirm ? 'register-confirm-error' : undefined
              "
              @input="clearFieldError('passwordConfirm')"
            />
          </BaseFormGroup>

          <BaseFormGroup id="register-privacy" :error="errors.privacy">
            <BaseCheckbox
              v-model="acceptedPrivacy"
              class="mt-1"
              :aria-describedby="
                errors.privacy ? 'register-privacy-error' : undefined
              "
              @change="clearFieldError('privacy')"
            >
              <i18n-t keypath="auth.login.terms">
                <template #privacy>
                  <BaseLink to="/legal/privacy-policy">
                    {{ t('legal.privacy.title') }}
                  </BaseLink>
                </template>
                <template #terms>
                  <BaseLink to="/legal/terms">
                    {{ t('legal.terms.title') }}
                  </BaseLink>
                </template>
              </i18n-t>
            </BaseCheckbox>
          </BaseFormGroup>

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
          {{ t('auth.login.register') }}
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
        class="w-full justify-center"
        @click="initiateGoogleLogin"
      >
        <GoogleIcon :size="16" />
        <span>{{ t('auth.login.register_google') }}</span>
      </BaseButton>

      <!-- Switch to Login -->
      <div class="text-center mt-8">
        <p class="text-sm text-on-ghost-muted">
          {{
            t('auth.login.have_account', {
              defaultValue: 'Already have an account?',
            })
          }}
          <button
            type="button"
            class="text-on-ghost font-medium hover:opacity-75 transition-opacity cursor-pointer"
            @click="navigateToLogin"
          >
            {{ t('auth.login.login') }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>
