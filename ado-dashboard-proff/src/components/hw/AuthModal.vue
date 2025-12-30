<template>
  <div class="blurit">
    <div class="modal-wrapper">
      <div class="card rlc modal-card">
        <div class="modal-header">
          <h3 class="modal-title">{{ mode === 'login' ? 'Anmelden' : 'Registrieren' }}</h3>
          <button
              data-umami-event="AuthModal schließen"
              class="btn ghost close-btn"
              @click="$emit('close')"
          >
            Schließen
          </button>
        </div>

        <div class="tab-wrapper">
          <TabSwitcher
              :items="tabs"
              :active-id="mode"
              @change="handleTabChange"
          />
        </div>

        <form @submit.prevent="submit" class="form-content">
          <div class="form-group">
            <input
                class="input"
                v-model="email"
                placeholder="E-Mail"
                type="email"
                autocomplete="email"
                @input="clearFieldError('email')"
            />
            <div v-if="errors.email" class="field-error">{{ errors.email }}</div>
          </div>

          <div class="form-group">
            <div class="password-field-wrapper">
              <div class="password-wrapper">
                <input
                    class="input"
                    :type="showPassword ? 'text' : 'password'"
                    v-model="password"
                    placeholder="Passwort (min. 8 Zeichen)"
                    autocomplete="current-password"
                    @input="clearFieldError('password')"
                />
                <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="password-toggle"
                    aria-label="Passwort anzeigen/verstecken"
                >
                  <component :is="showPassword ? EyeOff : Eye" size="20" />
                </button>
              </div>
              <button
                  v-if="mode === 'login'"
                  type="button"
                  data-umami-event="Passwort vergessen Button"
                  class="forgot-password-link"
                  @click="openReset"
              >
                Passwort vergessen?
              </button>
            </div>
            <div v-if="errors.password" class="field-error">{{ errors.password }}</div>
          </div>

          <div v-if="mode === 'register'" class="form-group">
            <div class="password-wrapper">
              <input
                  class="input"
                  :type="showPassword ? 'text' : 'password'"
                  v-model="passwordConfirm"
                  placeholder="Passwort bestätigen"
                  autocomplete="new-password"
                  @input="clearFieldError('passwordConfirm')"
              />
              <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="password-toggle"
                  aria-label="Passwort anzeigen/verstecken"
              >
                <component :is="showPassword ? EyeOff : Eye" size="20" />
              </button>
            </div>
            <div v-if="errors.passwordConfirm" class="field-error">{{ errors.passwordConfirm }}</div>
          </div>

          <div v-if="mode === 'register'" class="form-group">
            <label class="checkbox-container">
              <input type="checkbox" v-model="acceptedPrivacy" @change="clearFieldError('privacy')" />
              <span class="checkmark"></span>
              <span class="checkbox-label">
                Ich stimme der
                <a href="/impressum-&-datenschutz/impressum" target="_blank" class="privacy-link">
                  Datenschutzerklärung und AGB
                </a>
                zu
              </span>
            </label>
            <div v-if="errors.privacy" class="field-error privacy-error">{{ errors.privacy }}</div>
          </div>

          <div v-if="message" class="message" :class="{ error: isError }">
            {{ message }}
          </div>

          <div class="form-actions">
            <button
                type="submit"
                data-umami-event="Anmelden/Registrieren Button"
                class="btn ghost submit-btn"
                :disabled="submitting"
            >
              <LoadingSpinner v-if="submitting" color="white" size="1.2em" />
              <span v-else>{{ mode === 'login' ? 'Anmelden' : 'Registrieren' }}</span>
            </button>
          </div>
        </form>
      </div>

      <ResetModal
          v-if="showReset"
          @close="showReset = false"
          @success="onResetSuccess"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import hw from '../../hwApi';
import LoadingSpinner from "../LoadingSpinner.vue";
import TabSwitcher from "../TabSwitcher.vue";
import ResetModal from "../ResetModal.vue";
import { Eye, EyeOff } from 'lucide-vue-next';
import { syncCsrfFromCookie } from '../../hwApi';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'logged-in'): void
}>();

// Tab Configuration
const tabs = [
  { id: 'login', label: 'Anmelden', routePath: '' },
  { id: 'register', label: 'Registrieren', routePath: '' }
];

// State
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

const errors = reactive<{
  email?: string;
  password?: string;
  passwordConfirm?: string;
  privacy?: string
}>({});

// Methods
function handleTabChange(newId: string) {
  mode.value = newId as 'login' | 'register';
  clearAllErrors();
  message.value = '';
  isError.value = false;
  passwordConfirm.value = '';
  acceptedPrivacy.value = false;
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

  // Email validation
  if (!email.value || !email.value.trim()) {
    errors.email = 'Bitte E-Mail angeben.';
    ok = false;
  } else {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.value.trim())) {
      errors.email = 'Bitte gültige E-Mail-Adresse eingeben.';
      ok = false;
    }
  }

  // Password validation
  if (!password.value) {
    errors.password = 'Bitte Passwort angeben.';
    ok = false;
  } else if (password.value.length < 8) {
    errors.password = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
    ok = false;
  }

  // Password confirmation (register only)
  if (mode.value === 'register') {
    if (!passwordConfirm.value) {
      errors.passwordConfirm = 'Bitte Passwort bestätigen.';
      ok = false;
    } else if (password.value !== passwordConfirm.value) {
      errors.passwordConfirm = 'Die Passwörter stimmen nicht überein.';
      ok = false;
    }

    // Privacy checkbox
    if (!acceptedPrivacy.value) {
      errors.privacy = 'Bitte stimmen Sie der Datenschutzerklärung zu.';
      ok = false;
    }
  }

  return ok;
}

async function submit() {
  message.value = '';
  isError.value = false;

  const valid = validateBeforeSubmit();
  if (!valid) {
    message.value = 'Bitte die Fehler im Formular korrigieren.';
    isError.value = true;
    return;
  }

  submitting.value = true;
  try {
    if (mode.value === 'register') {
      await hw.post('/api/auth/register', {
        email: email.value,
        password: password.value
      });
      message.value = 'Registriert. Überprüfe dein E-Mail-Postfach...';
      isError.value = false;
    } else {
      const { data } = await hw.post('/api/auth/login', {
        email: email.value,
        password: password.value
      });

      if (data.ok) {
        syncCsrfFromCookie();
        emit('logged-in');
      }
    }
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Unbekannter Fehler';
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.modal-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--lbg);
  padding: 24px;
  box-shadow: var(--shadow-l);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  margin: 0;
  color: var(--text);
  font-size: 1.5rem;
  font-weight: 700;
}

.close-btn {
  color: var(--text);
  padding: 8px 12px;
}

.tab-wrapper {
  margin-bottom: 24px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-field-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.password-toggle:hover {
  opacity: 0.7;
}

.forgot-password-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--sub);
  cursor: pointer;
  text-align: right;
  align-self: flex-end;
  font-size: var(--font-size-small);
}

.forgot-password-link:hover {
  color: var(--text);
}

.checkbox-container {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  user-select: none;
  gap: 8px;
}

.checkbox-container input {
  display: none;
}

.checkmark {
  min-width: 18px;
  height: 18px;
  border: 2px solid var(--text);
  border-radius: 4px;
  position: relative;
  margin-top: 2px;
  transition: all 0.2s ease;
}

.checkbox-container input:checked ~ .checkmark {
  background-color: var(--primary);
  border-color: var(--primary);
}

.checkmark::after {
  content: "";
  position: absolute;
  display: none;
  left: 4px;
  top: 0;
  width: 5px;
  height: 10px;
  border: solid var(--text);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-container input:checked ~ .checkmark::after {
  display: block;
}

.checkbox-label {
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
}

.privacy-link {
  color: var(--primary);
  text-decoration: underline;
  transition: opacity 0.2s ease;
}

.privacy-link:hover {
  opacity: 0.8;
}

.field-error {
  color: var(--danger);
  font-size: 13px;
  margin-top: 4px;
}

.privacy-error {
  margin-left: 26px;
}

.message {
  color: var(--primary);
  font-size: var(--font-size-small);
}

.message.error {
  color: var(--danger);
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

@media (max-width: 768px) {
  .modal-card {
    max-width: 100%;
    margin: 0;
  }

  .modal-title {
    font-size: 1.25rem;
  }
}
</style>