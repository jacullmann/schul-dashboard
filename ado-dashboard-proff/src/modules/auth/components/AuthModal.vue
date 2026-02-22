<template>
  <Modal @cancel="$emit('close')">
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
          <TabSwitcher
              :items="tabs"
              :active-id="mode"
              @change="handleTabChange"
          />
        </div>

        <form @submit.prevent="submit" class="form-content">
          <div class="form-group">
            <label for="auth-email">{{ t('account.auth.email') }}</label>
            <div class="input-wrapper">
              <input
                  id="auth-email"
                  ref="emailInputRef"
                  class="input"
                  v-model="email"
                  :placeholder="t('account.auth.email')"
                  type="email"
                  autocomplete="email"
                  @input="clearFieldError('email')"
              />

              <div v-if="errors.email" class="field-error">{{ errors.email }}</div>
            </div>
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

            <div v-if="errors.password" class="field-error">{{ errors.password }}</div>
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
                      :placeholder="t('account.auth.confirmPassword')"
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
    </template>

    <template #actions>
      <button
          type="submit"
          class="btn action submit-btn"
          :disabled="submitting"
          @click="submit"
      >
        <LoadingSpinner v-if="submitting" color="white" size="1.2em" />
        <span v-else>{{ mode === 'login' ? t('account.auth.login') : t('account.auth.register') }}</span>
      </button>
    </template>
  </Modal>

  <ResetModal
      v-if="showReset"
      @close="showReset = false"
      @success="onResetSuccess"
  />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import hw from '@/api/hwApi';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import TabSwitcher from "@/common/components/TabSwitcher.vue";
import Modal from '@/common/components/Modal.vue';
import Checkbox from '@/common/components/Checkbox.vue';
import ResetModal from "@/modules/auth/components/ResetModal.vue";
import MfaVerifyModal from "@/modules/auth/components/MfaVerifyModal.vue";
import { Eye, EyeOff } from 'lucide-vue-next';
import { syncCsrfFromCookie, setCsrfToken } from '@/api/hwApi';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'logged-in'): void;
}>();

const tabs = [
  { id: 'login', label: t('account.auth.login'), routePath: '' },
  { id: 'register', label: t('account.auth.register'), routePath: '' }
];

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const acceptedPrivacy = ref(false);
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const showPassword = ref(false);
const showReset = ref(false);
const showMfaVerify = ref(false);
const { cancelMfaLogin, resetMfaState } = useMfa();

const emailInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  emailInputRef.value?.focus();
});

const errors = reactive<{
  email?: string;
  password?: string;
  passwordConfirm?: string;
  privacy?: string;
}>({});

function handleTabChange(newId: string) {
  mode.value = newId as 'login' | 'register';
  clearAllErrors();
  message.value = '';
  isError.value = false;
  passwordConfirm.value = '';
  acceptedPrivacy.value = false;
  if (showMfaVerify.value) {
    cancelMfaLogin();
    showMfaVerify.value = false;
  }
}

function openReset() {
  showReset.value = true;
}

function onResetSuccess() {
  message.value = 'Passwort erfolgreich zurückgesetzt. Bitte einloggen.';
  isError.value = false;
  showReset.value = false;
  mode.value = 'login';
}

function clearAllErrors() {
  errors.email = undefined;
  errors.password = undefined;
  errors.passwordConfirm = undefined;
  errors.privacy = undefined;
}

function clearFieldError(field: 'email' | 'password' | 'passwordConfirm' | 'privacy') {
  errors[field] = undefined;
  message.value = '';
  isError.value = false;
}

function validateBeforeSubmit(): boolean {
  clearAllErrors();
  let ok = true;

  if (!email.value?.trim()) {
    errors.email = t('account.auth.errors.emailMissing');
    ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errors.email = t('account.auth.errors.emailWrong');
    ok = false;
  }

  if (!password.value) {
    errors.password = t('account.auth.errors.passwordMissing');
    ok = false;
  } else if (password.value.length < 8) {
    errors.password = mode.value === 'login' ? t('account.auth.errors.passwordShort') : t('account.auth.errors.newShort');
    ok = false;
  }

  if (mode.value === 'register') {
    if (!passwordConfirm.value) {
      errors.passwordConfirm = t('account.auth.errors.confirmMissing');
      ok = false;
    } else if (password.value !== passwordConfirm.value) {
      errors.passwordConfirm = t('account.auth.errors.confirmWrong');
      ok = false;
    }

    if (!acceptedPrivacy.value) {
      errors.privacy = t('account.auth.errors.termsMissing');
      ok = false;
    }
  }

  return ok;
}

async function submit() {
  if (showMfaVerify.value) return;
  message.value = '';
  isError.value = false;

  if (!validateBeforeSubmit()) {
    message.value = 'Bitte die Fehler im Formular korrigieren.';
    isError.value = true;
    return;
  }

  submitting.value = true;
  try {
    if (mode.value === 'register') {
      await hw.post('/api/auth/register', { email: email.value, password: password.value });
      message.value = t('account.auth.successRegister');
      isError.value = false;
    } else {
      const { data } = await hw.post('/api/auth/login', { email: email.value, password: password.value });
      if (data.ok) {
        if (data.requiresMfa) {
          showMfaVerify.value = true;
        } else {
          if (data.csrfToken) {
            setCsrfToken(data.csrfToken);
          } else {
            syncCsrfFromCookie();
          }
          emit('logged-in');
        }
      }
    }
  } catch (e: any) {
    message.value = e.response?.data?.error || t('global.errors.unknown');
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}

function onMfaVerified(csrfToken: string) {
  showMfaVerify.value = false;
  if (csrfToken) {
    setCsrfToken(csrfToken);
  } else {
    syncCsrfFromCookie();
  }
  resetMfaState();
  emit('logged-in');
}

function onMfaCancelled() {
  showMfaVerify.value = false;
  resetMfaState();
  message.value = 'Anmeldung abgebrochen.';
  isError.value = true;
}

const enter = (el: Element) => {
  const e = el as HTMLElement;
  const height = e.scrollHeight;
  e.style.cssText = 'height:0;opacity:0;margin-top:0;margin-bottom:0;overflow:hidden';
  e.offsetHeight;
  e.style.transition = 'height 0.3s cubic-bezier(0.78,0,0.22,1),opacity 0.3s cubic-bezier(0.78,0,0.22,1),margin 0.3s cubic-bezier(0.78,0,0.22,1)';
  e.style.height = height + 'px';
  e.style.opacity = '1';
  e.style.marginTop = '';
  e.style.marginBottom = '';
};

const afterEnter = (el: Element) => {
  const e = el as HTMLElement;
  e.style.height = 'auto';
  e.style.overflow = '';
  e.style.transition = '';
};

const leave = (el: Element) => {
  const e = el as HTMLElement;
  e.style.height = e.scrollHeight + 'px';
  e.style.overflow = 'hidden';
  e.offsetHeight;
  e.style.transition = 'height 0.3s cubic-bezier(0.78,0,0.22,1),opacity 0.3s cubic-bezier(0.78,0,0.22,1),margin 0.3s cubic-bezier(0.78,0,0.22,1)';
  e.style.height = '0';
  e.style.opacity = '0';
  e.style.marginTop = '0';
  e.style.marginBottom = '0';
};
</script>

<style scoped>
/* Constrain to login-size width */
:deep(.modal-card) {
  max-width: 420px;
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
  line-height: 1.5;
}

.privacy-link {
  color: var(--sub);
  text-decoration: underline;
  transition: color 0.2s ease;
}

.privacy-link:hover {
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
  color: var(--primary);
  font-size: var(--font-size-sub);
  margin-bottom: 12px;
}

.message.error {
  color: var(--danger);
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

@media (max-width: 500px) {
  :deep(.modal-card) {
    max-width: 100%;
  }
}
</style>