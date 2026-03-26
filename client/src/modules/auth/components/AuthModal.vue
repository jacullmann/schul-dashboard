<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseTabs from "@/common/components/BaseTabs.vue";
import ResetModal from "@/modules/auth/components/ResetModal.vue";
import MfaVerifyModal from "@/modules/auth/components/MfaVerifyModal.vue";
import { useAuthModal } from '@/modules/auth/composables/useAuthModal';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'cancel'): void;
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

<template>
  <BaseModal @cancel="$emit('cancel')">
    <template #title>
      {{ mode === 'login' ? t('account.auth.login') : t('account.auth.register') }}
    </template>

    <template #content>
      <MfaVerifyModal
          v-if="showMfaVerify"
          @verified="onMfaVerified"
          @cancelled="onMfaCancelled"
      />

      <template v-else>
        <div class="tab-wrapper">
          <BaseTabs
              :items="tabs"
              :active-id="mode"
              @change="handleTabChange"
          />
        </div>

        <form id="auth-form" @submit.prevent="submit" class="form-content" novalidate>
          <div class="form-group">
            <BaseLabel for="auth-email">{{ t('account.auth.email') }}</BaseLabel>
            <div class="input-wrapper">
              <BaseInput
                  id="auth-email"
                  ref="emailInputRef"
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
            <BaseLabel for="auth-password">{{ t('account.auth.password') }}</BaseLabel>
            <BaseInput
                id="auth-password"
                type="password"
                v-model="password"
                :placeholder="t('account.auth.passwordPlaceholder')"
                autocomplete="current-password"
                @input="clearFieldError('password')"
            />

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
                <BaseLabel for="auth-confirm">{{ t('account.auth.confirmPassword') }}</BaseLabel>
                  <BaseInput
                      id="auth-confirm"
                      type="password"
                      v-model="passwordConfirm"
                      :placeholder="t('account.auth.confirmPlaceholder')"
                      autocomplete="new-password"
                      @input="clearFieldError('passwordConfirm')"
                  />

                <div v-if="errors.passwordConfirm" class="field-error">{{ errors.passwordConfirm }}</div>
              </div>

              <div class="form-group">
                <BaseCheckbox v-model="acceptedPrivacy" @change="clearFieldError('privacy')" v-html="t('account.auth.terms')" />

                <div v-if="errors.privacy" class="field-error privacy-error">{{ errors.privacy }}</div>
              </div>
            </div>
          </Transition>

          <div v-if="message" class="message" :class="{ error: isError }">
            {{ message }}
          </div>
        </form>
      </template>
    </template>

    <template #actions>
      <BaseButton form="auth-form" type="submit" class="submit-btn" :disabled="submitting" variant="action" :loading="submitting">
        {{ mode === 'login' ? t('account.auth.login') : t('account.auth.register') }}
      </BaseButton>
    </template>
  </BaseModal>

  <ResetModal
      v-if="showReset"
      @cancel="showReset = false"
      @success="onResetSuccess"
  />
</template>

<style scoped>
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

.forgot-password-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  text-align: right;
  align-self: flex-end;
  font-size: var(--text-sub);
  margin-top: 8px;
}

.forgot-password-link:hover {
  color: var(--color-on-surface);
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
  color: var(--color-on-surface);
  font-size: var(--text-sub);
  line-height: 18px;
}

:deep(.privacy-link) {
  color: var(--color-on-surface-muted);
  text-decoration: underline;
  transition: color 0.2s ease;
}

:deep(.privacy-link:hover) {
  color: var(--color-on-surface);
}

.field-error {
  color: var(--color-danger);
  font-size: var(--text-sub);
  margin-top: 4px;
}

.privacy-error {
  margin-left: 26px;
}

.message {
  color: var(--color-on-surface);
  font-size: var(--text-sub);
  margin-bottom: 16px;
}

.message.error {
  color: var(--color-danger);
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