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
    </div>

    <ResetModal
        v-if="showReset"
        @close="showReset = false"
        @success="onResetSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import TabSwitcher from "@/common/components/TabSwitcher.vue";
import Checkbox from '@/common/components/Checkbox.vue';
import ResetModal from "@/modules/auth/components/ResetModal.vue";
import MfaVerifyModal from "@/modules/auth/components/MfaVerifyModal.vue";
import { Eye, EyeOff } from 'lucide-vue-next';
import { useAuthModal } from '@/modules/auth/composables/useAuthModal';

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
</script>

<style scoped>
.auth-form-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg);
  padding: 32px;
  border-radius: var(--border-7);
  box-shadow: var(--menu-shadow);
}

.auth-header {
  text-align: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: var(--font-size-h2);
  font-weight: 700;
  color: var(--text);
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
  color: var(--text);
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
  color: var(--text);
}

.privacy-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font: inherit;
  color: inherit;
  font-weight: inherit;
  margin: 0;
  padding: 0;
}

.checkbox-label {
  color: var(--text);
  font-size: var(--font-size-sub);
  line-height: 18px;
}

:deep(.privacy-link) {
  color: var(--sub);
  text-decoration: underline;
  transition: color 0.2s ease;
}

:deep(.privacy-link:hover) {
  color: var(--text);
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
  color: var(--text);
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
</style>