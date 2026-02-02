<template>
  <div class="blurit">
    <div class="card rlc modal">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Passwort ändern</h3>
        <button
            data-umami-event="Passwort ändern Modal schließen"
            class="btn ghost"
            @click="$emit('close')"
            :disabled="submitting"
        >
          Schließen
        </button>
      </div>

      <div style="margin-top:12px;">
        <p style="color: var(--sub); font-size: 14px;">
          Gib bitte dein aktuelles (altes) Passwort ein.
        </p>

        <!-- Aktuelles Passwort -->
        <div style="margin-top:16px; position: relative;">
          <label for="currentPassword" style="display: block; margin-bottom: 6px; font-size: 14px; color: var(--text);">
            Aktuelles Passwort
          </label>
          <input
              ref="currentPasswordRef"
              id="currentPassword"
              class="input"
              :type="showCurrentPassword ? 'text' : 'password'"
              v-model="currentPassword"
              placeholder="Aktuelles Passwort eingeben"
              @input="clearFieldError('current')"
          />
          <button
              type="button"
              @click="showCurrentPassword = !showCurrentPassword"
              class="password-toggle"
              aria-label="Toggle password visibility"
          >
            <component :is="showCurrentPassword ? EyeOff : Eye" size="20" />
          </button>
          <div v-if="errors.current" class="field-error">{{ errors.current }}</div>
        </div>

        <!-- Neues Passwort -->
        <div style="margin-top:12px; position: relative;">
          <label for="newPassword" style="display: block; margin-bottom: 6px; font-size: 14px; color: var(--text);">
            Neues Passwort
          </label>
          <input
              id="newPassword"
              class="input"
              :type="showNewPassword ? 'text' : 'password'"
              v-model="newPassword"
              placeholder="Neues Passwort (min. 8 Zeichen)"
              @input="clearFieldError('new')"
          />
          <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="password-toggle"
              aria-label="Toggle password visibility"
          >
            <component :is="showNewPassword ? EyeOff : Eye" size="20" />
          </button>
          <div v-if="errors.new" class="field-error">{{ errors.new }}</div>
        </div>

        <!-- Neues Passwort bestätigen -->
        <div style="margin-top:12px; position: relative;">
          <label for="newPassword2" style="display: block; margin-bottom: 6px; font-size: 14px; color: var(--text);">
            Neues Passwort bestätigen
          </label>
          <input
              id="newPassword2"
              class="input"
              :type="showNewPassword2 ? 'text' : 'password'"
              v-model="newPassword2"
              placeholder="Neues Passwort wiederholen"
              @input="clearFieldError('confirm')"
          />
          <button
              type="button"
              @click="showNewPassword2 = !showNewPassword2"
              class="password-toggle"
              aria-label="Toggle password visibility"
          >
            <component :is="showNewPassword2 ? EyeOff : Eye" size="20" />
          </button>
          <div v-if="errors.confirm" class="field-error">{{ errors.confirm }}</div>
        </div>

        <!-- Allgemeine Fehlermeldung -->
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }" style="margin-top:12px;">
          {{ message }}
        </div>

        <!-- Submit Button -->
        <div class="row" style="margin-top:16px;">
          <button
              data-umami-event="Neues Passwort festlegen Button"
              class="btn action"
              @click="submit"
              :disabled="submitting"
              style="width: 100%;"
          >
            <LoadingSpinner v-if="submitting" size="1.1em" />
            <span v-else>Neues Passwort festlegen</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import hw from '../../hwApi';
import { Eye, EyeOff } from 'lucide-vue-next';
import LoadingSpinner from '../LoadingSpinner.vue';

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
    errors.current = 'Bitte aktuelles Passwort eingeben.';
    ok = false;
  } else if (currentPassword.value.length < 8) {
    errors.current = 'Passwort muss mindestens 8 Zeichen lang sein.';
    ok = false;
  }

  // Neues Passwort
  if (!newPassword.value) {
    errors.new = 'Bitte neues Passwort eingeben.';
    ok = false;
  } else if (newPassword.value.length < 8) {
    errors.new = 'Neues Passwort muss mindestens 8 Zeichen lang sein.';
    ok = false;
  }

  // Neues Passwort bestätigen
  if (!newPassword2.value) {
    errors.confirm = 'Bitte neues Passwort bestätigen.';
    ok = false;
  } else if (newPassword.value !== newPassword2.value) {
    errors.confirm = 'Passwörter stimmen nicht überein.';
    ok = false;
  }

  // Gleiche Passwörter?
  if (ok && currentPassword.value === newPassword.value) {
    errors.new = 'Neues Passwort muss sich vom aktuellen unterscheiden.';
    ok = false;
  }

  return ok;
}

async function submit() {
  setMessage('');
  const valid = validateBeforeSubmit();

  if (!valid) {
    setMessage('Bitte die Fehler im Formular korrigieren.', true);
    return;
  }

  submitting.value = true;
  try {
    const { data } = await hw.post('/api/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    });

    setMessage('Passwort erfolgreich geändert!', false);
    emit('success');

    // Modal nach 1 Sekunde schließen
    setTimeout(() => emit('close'), 1000);
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || 'Fehler beim Ändern des Passworts';
    setMessage(errorMsg, true);

    // Spezifischer Fehler für falsches aktuelles Passwort
    if (errorMsg.includes('falsch')) {
      errors.current = 'Aktuelles Passwort ist falsch';
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
  box-shadow: var(--shadow-l);
}

.small {
  font-size: 13px;
}

.field-error {
  color: #ff7777;
  font-size: 13px;
  margin-top: 6px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 70%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #aaaaaa;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: #f1f1f1;
}

label {
  user-select: none;
}

/* Responsive */
@media (max-width: 480px) {
  .modal {
    max-width: 92vw;
    padding: 16px;
  }
}
</style>