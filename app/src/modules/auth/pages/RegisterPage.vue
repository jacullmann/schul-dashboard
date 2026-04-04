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
        <BaseHeading :level="1" class="!text-center">
          {{ t('account.auth.register') }}
        </BaseHeading>
        <p class="text-sub text-on-surface-muted mt-2">
          {{
            t('account.auth.registerDescription', {
              defaultValue: 'Create your account',
            })
          }}
        </p>
      </div>

      <BaseForm :submit="handleSubmit" :loading="submitting" class="mb-6">
        <template #content>
          <BaseFormGroup id="register-email" :error="errors.email">
            <BaseLabel for="register-email">
              {{ t('account.auth.email') }}
            </BaseLabel>
            <BaseInput
              id="register-email"
              ref="emailInputRef"
              v-model="email"
              :placeholder="t('account.auth.emailPlaceholder')"
              type="email"
              autocomplete="email"
              required
              @input="clearFieldError('email')"
              :aria-describedby="
                errors.email ? 'register-email-error' : undefined
              "
            />
          </BaseFormGroup>

          <BaseFormGroup id="register-password" :error="errors.password">
            <BaseLabel for="register-password">
              {{ t('account.auth.password') }}
            </BaseLabel>
            <BaseInput
              id="register-password"
              v-model="password"
              :placeholder="t('account.auth.passwordPlaceholder')"
              type="password"
              autocomplete="new-password"
              required
              @input="clearFieldError('password')"
              :aria-describedby="
                errors.password ? 'register-password-error' : undefined
              "
            />
          </BaseFormGroup>

          <BaseFormGroup id="register-confirm" :error="errors.passwordConfirm">
            <BaseLabel for="register-confirm">
              {{ t('account.auth.confirmPassword') }}
            </BaseLabel>
            <BaseInput
              id="register-confirm"
              v-model="passwordConfirm"
              :placeholder="t('account.auth.confirmPlaceholder')"
              type="password"
              autocomplete="new-password"
              required
              @input="clearFieldError('passwordConfirm')"
              :aria-describedby="
                errors.passwordConfirm ? 'register-confirm-error' : undefined
              "
            />
          </BaseFormGroup>

          <BaseFormGroup id="register-privacy" :error="errors.privacy">
            <BaseCheckbox
              v-model="acceptedPrivacy"
              class="mt-1"
              @change="clearFieldError('privacy')"
              :aria-describedby="
                errors.privacy ? 'register-privacy-error' : undefined
              "
            >
              <i18n-t keypath="account.auth.terms">
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
          {{ t('account.auth.register') }}
        </template>
      </BaseForm>

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
          {{
            t('account.auth.haveAccount', {
              defaultValue: 'Already have an account?',
            })
          }}
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
