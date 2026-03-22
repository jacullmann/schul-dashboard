<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import TabSwitcher from "@/common/components/TabSwitcher.vue";
import Checkbox from '@/common/components/Checkbox.vue';
import ResetModal from "@/modules/auth/components/ResetModal.vue";
import MfaVerifyModal from "@/modules/auth/components/MfaVerifyModal.vue";
import { Eye, EyeOff } from 'lucide-vue-next';
import { useAuthModal } from '@/modules/auth/composables/useAuthModal';
import { useOAuth } from '@/modules/auth/composables/useOAuth';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'logged-in'): void;
}>();

const {
  tabs,
  mode,
  email,
  password,
  passwordConfirm,
  acceptedPrivacy,
  submitting,
  message,
  isError,
  showPassword,
  showReset,
  showMfaVerify,
  emailInputRef,
  errors,
  handleTabChange,
  openReset,
  onResetSuccess,
  clearFieldError,
  submit,
  onMfaVerified,
  onMfaCancelled,
  enter,
  afterEnter,
  leave
} = useAuthModal(() => emit('logged-in'));

const { initiateGoogleLogin } = useOAuth();
</script>

<template>
  <div class="auth-form-container">
    <div class="auth-header">
      <h2 class="card-title">{{ mode === 'login' ? t('account.auth.login') : t('account.auth.register') }}</h2>
    </div>

    <MfaVerifyModal
        v-if="showMfaVerify"
        @verified="onMfaVerified"
        @cancelled="onMfaCancelled"
    />

    <template v-else>
      <div class="tab-wrapper">
        <TabSwitcher
            :items="tabs"
            :active-id="mode"
            @change="handleTabChange"
        />
      </div>

      <form id="auth-form" @submit.prevent="submit" class="form-content" novalidate>
        <div class="form-group">
          <label for="auth-email">{{ t('account.auth.email') }}</label>
          <div class="input-wrapper">
            <input
                id="auth-email"
                ref="emailInputRef"
                class="input"
                v-model="email"
                :placeholder="t('account.auth.emailPlaceholder')"
                type="email"
                autocomplete="email"
                @input="clearFieldError('email')"
            />
          </div>
          <div v-if="errors.email" class="field-error">{{ errors.email }}</div>
        </div>

        <div class="form-group">
          <label for="auth-password">{{ t('account.auth.password') }}</label>
          <div class="input-wrapper">
            <input
                id="auth-password"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                :placeholder="t('account.auth.passwordPlaceholder')"
                autocomplete="current-password"
                @input="clearFieldError('password')"
            />
            <button
                type="button"
                @click="showPassword = !showPassword"
                class="password-toggle"
                :aria-label="t('account.auth.revealLabel')"
            >
              <component :is="showPassword ? EyeOff : Eye" :size="20" />
            </button>
          </div>

          <div v-if="errors.password" class="field-error">{{ errors.password }}</div>

          <Transition @enter="enter" @after-enter="afterEnter" @leave="leave">
            <button
                v-if="mode === 'login'"
                type="button"
                class="forgot-password-link"
                @click="openReset"
            >
              {{ t('account.auth.forgot') }}
            </button>
          </Transition>
        </div>

        <Transition @enter="enter" @after-enter="afterEnter" @leave="leave">
          <div v-if="mode === 'register'" class="register-fields-wrapper">
            <div class="form-group">
              <label for="auth-confirm">{{ t('account.auth.confirmPassword') }}</label>
              <div class="input-wrapper">
                <input
                    id="auth-confirm"
                    class="input"
                    :type="showPassword ? 'text' : 'password'"
                    v-model="passwordConfirm"
                    :placeholder="t('account.auth.confirmPlaceholder')"
                    autocomplete="new-password"
                    @input="clearFieldError('passwordConfirm')"
                />
                <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="password-toggle"
                    :aria-label="t('account.auth.revealLabel')"
                >
                  <component :is="showPassword ? EyeOff : Eye" :size="20" />
                </button>
              </div>
              <div v-if="errors.passwordConfirm" class="field-error">{{ errors.passwordConfirm }}</div>
            </div>

            <div class="form-group">
              <label class="privacy-row">
                <Checkbox v-model="acceptedPrivacy" @change="clearFieldError('privacy')" />
                <span class="checkbox-label" v-html="t('account.auth.terms')" />
              </label>

              <div v-if="errors.privacy" class="field-error privacy-error">{{ errors.privacy }}</div>
            </div>
          </div>
        </Transition>

        <div v-if="message" class="message" :class="{ error: isError }">
          {{ message }}
        </div>
      </form>
    </template>

    <div class="auth-actions" v-if="!showMfaVerify">
      <button
          form="auth-form"
          type="submit"
          class="btn action submit-btn"
          :disabled="submitting"
      >
        <LoadingSpinner v-if="submitting" color="white" size="1.2em" />
        <span v-else>{{ mode === 'login' ? t('account.auth.login') : t('account.auth.register') }}</span>
      </button>

      <div class="oauth-divider" aria-hidden="true">
        <span>{{ t('account.auth.orContinueWith', 'oder') }}</span>
      </div>

      <button
          type="button"
          class="btn ghost submit-btn"
          @click="initiateGoogleLogin"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
        </svg>
        <span>{{ mode === 'login' ? t('account.auth.loginGoogle') : t('account.auth.registerGoogle') }}</span>
      </button>
    </div>

    <ResetModal
        v-if="showReset"
        @close="showReset = false"
        @success="onResetSuccess"
    />
  </div>
</template>

<style scoped>
.auth-form-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background: var(--bg-canvas);
  padding: 16px;
  border-radius: var(--border-radius-xl);
}

.auth-header {
  text-align: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: var(--font-size-h2);
  font-weight: 700;
  color: var(--text-default);
  margin: 0;
  letter-spacing: -0.01em;
}

.tab-wrapper {
  margin-bottom: 24px;
}

.form-content {
  display: flex;
  flex-direction: column;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.input-wrapper {
  display: flex;
  flex-direction: row;
  position: relative;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--sub);
  display: flex;
  align-items: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--text-default);
}

.forgot-password-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--sub);
  cursor: pointer;
  text-align: right;
  align-self: flex-end;
  font-size: var(--font-size-sub);
  margin-top: 8px;
}

.forgot-password-link:hover {
  color: var(--text-default);
}

.privacy-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font: inherit;
  color: inherit;
  margin: 0;
  padding: 0;
}

.checkbox-label {
  color: var(--text-default);
  font-size: var(--font-size-sub);
  line-height: 18px;
}

:deep(.privacy-link) {
  color: var(--sub);
  text-decoration: underline;
  transition: color 0.2s ease;
}

:deep(.privacy-link:hover) {
  color: var(--text-default);
}

.field-error {
  color: var(--danger);
  font-size: var(--font-size-sub);
  margin-top: 4px;
}

.privacy-error {
  margin-left: 26px;
}

.message {
  color: var(--text-default);
  font-size: var(--font-size-sub);
  margin-bottom: 16px;
}

.message.error {
  color: var(--danger);
}

.auth-actions {
  margin-top: 8px;
}

.submit-btn {
  width: 100%;
  justify-content: center;
  font-weight: 600;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.oauth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--sub);
  font-size: var(--font-size-footnote);
  margin-block: 8px;
}

.oauth-divider::before,
.oauth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-canvas);
}
</style>