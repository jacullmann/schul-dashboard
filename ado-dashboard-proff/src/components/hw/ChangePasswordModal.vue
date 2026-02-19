<template>
  <div class="blurit">
    <div class="card rlc modal">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin-bottom: 16px;">{{ t('account.menu.changePassword.title') }}</h3>
        <button
            class="btn ghost"
            @click="$emit('close')"
            :disabled="submitting"
        >
          {{ t('global.buttons.close') }}
        </button>
      </div>

      <div>
        <!-- Aktuelles Passwort -->
        <div class="password-wrapper">
          <label for="currentPassword">
            {{ t('account.menu.changePassword.currentPassword') }}
          </label>
          <div class="input-wrapper">
            <input
                ref="currentPasswordRef"
                id="currentPassword"
                class="input"
                :type="showCurrentPassword ? 'text' : 'password'"
                v-model="currentPassword"
                :placeholder="t('account.menu.changePassword.currentPlaceholder')"
                @input="clearFieldError('current')"
            />
            <button
                type="button"
                @click="showCurrentPassword = !showCurrentPassword"
                class="password-toggle"
                aria-label="Toggle password visibility"
            >
              <component :is="showCurrentPassword ? EyeOff : Eye" :size="20" />
            </button>
          </div>
          <div v-if="errors.current" class="field-error">{{ errors.current }}</div>
        </div>

        <!-- Neues Passwort -->
        <div class="password-wrapper">
          <label for="newPassword">
            {{ t('account.menu.changePassword.newPassword') }}
          </label>
          <div class="input-wrapper">
            <input
                id="newPassword"
                class="input"
                :type="showNewPassword ? 'text' : 'password'"
                v-model="newPassword"
                :placeholder="t('account.menu.changePassword.newPlaceholder')"
                @input="clearFieldError('new')"
            />
            <button
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="password-toggle"
                aria-label="Toggle password visibility"
            >
              <component :is="showNewPassword ? EyeOff : Eye" :size="20" />
            </button>
          </div>
          <div v-if="errors.new" class="field-error">{{ errors.new }}</div>
        </div>

        <!-- Neues Passwort bestätigen -->
        <div class="password-wrapper">
          <label for="newPassword2">
            {{ t('account.menu.changePassword.confirmPassword') }}
          </label>
          <div class="input-wrapper">
            <input
                id="newPassword2"
                class="input"
                :type="showNewPassword2 ? 'text' : 'password'"
                v-model="newPassword2"
                :placeholder="t('account.menu.changePassword.confirmPlaceholder')"
                @input="clearFieldError('confirm')"
            />
            <button
                type="button"
                @click="showNewPassword2 = !showNewPassword2"
                class="password-toggle"
                aria-label="Toggle password visibility"
            >
              <component :is="showNewPassword2 ? EyeOff : Eye" :size="20" />
            </button>
          </div>
          <div v-if="errors.confirm" class="field-error">{{ errors.confirm }}</div>
        </div>

        <!-- Allgemeine Fehlermeldung -->
        <label v-if="message" :style="{ color: isError ? 'var(--danger)' : 'var(--text)' }">
          {{ message }}
        </label>

        <!-- Submit Button -->
        <div class="row">
          <button
              class="btn action"
              @click="submit"
              :disabled="submitting"
          >
            <LoadingSpinner v-if="submitting" size="1.1em" />
            <span v-else>{{ t('account.menu.changePassword.title') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import hw from '@/hwApi';
import { Eye, EyeOff } from 'lucide-vue-next';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useI18n } from 'vue-i18n';

const{ t } = useI18n();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void
}>();

const currentPassword = ref('');
const newPassword = ref('');
const newPassword2 = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showNewPassword2 = ref(false);

const currentPasswordRef = ref<HTMLInputElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('close');
  }
  if (e.key === 'Enter' && !submitting.value) {
    submit();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  currentPasswordRef.value?.focus();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const errors = reactive<{
  current?: string;
  new?: string;
  confirm?: string
}>({});

function clearAllErrors() {
  errors.current = undefined;
  errors.new = undefined;
  errors.confirm = undefined;
}

function clearFieldError(field: 'current' | 'new' | 'confirm') {
  errors[field] = undefined;
  message.value = '';
  isError.value = false;
}

function setMessage(txt: string, error = false) {
  message.value = txt;
  isError.value = error;
}

function validateBeforeSubmit(): boolean {
  clearAllErrors();
  let ok = true;

  // Aktuelles Passwort
  if (!currentPassword.value) {
    errors.current = t('account.menu.changePassword.errors.currentMissing');
    ok = false;
  } else if (currentPassword.value.length < 8) {
    errors.current = t('account.menu.changePassword.errors.currentShort');
    ok = false;
  }

  // Neues Passwort
  if (!newPassword.value) {
    errors.new = t('account.menu.changePassword.errors.newMissing');
    ok = false;
  } else if (newPassword.value.length < 8) {
    errors.new = t('account.menu.changePassword.errors.newShort');
    ok = false;
  }

  // Neues Passwort bestätigen
  if (!newPassword2.value) {
    errors.confirm = t('account.menu.changePassword.errors.confirmMissing');
    ok = false;
  } else if (newPassword.value !== newPassword2.value) {
    errors.confirm = t('account.menu.changePassword.errors.confirmWrong');
    ok = false;
  }

  // Gleiche Passwörter?
  if (ok && currentPassword.value === newPassword.value) {
    errors.new = t('account.menu.changePassword.errors.equal');
    ok = false;
  }

  return ok;
}

async function submit() {
  setMessage('');
  const valid = validateBeforeSubmit();

  if (!valid) {
    return;
  }

  submitting.value = true;
  try {
    const { data } = await hw.post('/api/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });

    setMessage(t('account.menu.changePassword.success'), false);
    emit('success');

    // Modal nach 1 Sekunde schließen
    setTimeout(() => emit('close'), 1000);
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || t('account.menu.changePassword.errors.failed');
    setMessage(errorMsg, true);

    // Spezifischer Fehler für falsches aktuelles Passwort
    if (errorMsg.includes('falsch')) {
      errors.current = t('account.menu.changePassword.errors.currentWrong');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.modal {
  width: 100%;
  max-width: 440px;
  padding: 20px;
  border-radius: 16px;
  background: var(--lbg);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--menu-shadow);
}

.password-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.input-wrapper {
  display: flex;
  flex-direction: row;
  position: relative;
  align-items: center;
}

.field-error {
  color: var(--danger);
  font-size: var(--font-size-sub);
  font-family: var(--normal-font);
  margin-top: 6px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--sub);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--text);
}

/* Responsive */
@media (max-width: 480px) {
  .modal {
    max-width: 92vw;
    padding: 16px;
  }
}
</style>