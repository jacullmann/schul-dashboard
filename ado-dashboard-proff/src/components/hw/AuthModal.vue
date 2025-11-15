<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card styl" style="width:100%; max-width:420px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; color:white;">{{ mode==='login' ? 'Anmelden' : 'Registrieren' }}</h3>
        <button data-umami-event="AuthModal schlißen" class="btn ghost" style="color:white;" @click="$emit('close')">Schließen</button>
      </div>

      <!-- Tabs -->
      <div class="row" style="margin-top:12px;">
        <button data-umami-event="Login Reiter" class="btn" :class="{ ghost: mode!=='login' }" @click="switchMode('login')">Login</button>
        <button data-umami-event="Registrieren Reiter" class="btn" :class="{ ghost: mode!=='register' }" @click="switchMode('register')">Registrieren</button>
      </div>

      <!-- Inputs -->
      <div style="margin-top:12px;">
        <input
            class="input"
            v-model="email"
            placeholder="E-Mail"
            @input="clearFieldError('email')"
        />
        <div v-if="errors.email" class="field-error">{{ errors.email }}</div>
      </div>

      <div style="margin-top:8px; position: relative;">
        <input
            class="input"
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            placeholder="Passwort (min. 8 Zeichen)"
            @input="clearFieldError('password')"
        />
        <button
            type="button"
            @click="showPassword = !showPassword"
            style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0; color: white;"
            aria-label="Toggle password visibility"
        >
          <component :is="showPassword ? EyeOff : Eye" size="20" />
        </button>
        <div v-if="errors.password" class="field-error">{{ errors.password }}</div>
      </div>


      <!-- Datenschutzerklärung Checkbox -->
      <div v-if="mode==='register'" class="checkbox-row">
        <label class="checkbox-container">
          <input type="checkbox" v-model="acceptedPrivacy" @change="clearFieldError('privacy')" />
          <span class="checkmark"></span>
          <span style="color:white; font-size:14px;">
            Ich stimme der
            <a href="/impressum-&-datenschutz/impressum" target="_blank" style="color:#3f93f8; text-decoration:underline;">
              Datenschutzerklärung und AGB
            </a>
            zu
          </span>
        </label>
        <div v-if="errors.privacy" class="field-error" style="margin-left:36px;">{{ errors.privacy }}</div>
      </div>

      <!-- Submit -->
      <div class="row" style="margin-top:12px; align-items:center;">
        <button data-umami-event="Anmelden/Registrieren Button" class="btn" @click="submit">
          <LoadingSpinner v-if="submitting" color="black" size="1.2em" />
          {{ mode==='login' ? 'Anmelden' : 'Registrieren' }}
        </button>
        <button data-umami-event="Passwort vergessen Button" class="btn ghost" @click="openReset" style="margin-right:8px;">Passwort vergessen?</button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>
    </div>
    <ResetModal
        v-if="showReset"
        @close="showReset=false"
        @success="onResetSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import hw from '../../hwApi';
import LoadingSpinner from "../LoadingSpinner.vue";
import { Eye, EyeOff } from 'lucide-vue-next';

import ResetModal from "../ResetModal.vue";
const showReset = ref(false);

function openReset() { showReset.value = true; }

const emit = defineEmits<{ (e: 'close'): void; (e: 'logged-in', token: string): void }>();

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const acceptedPrivacy = ref(false);
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const showPassword = ref(false);

// field-level errors shown after submit attempt
const errors = reactive<{ email?: string; password?: string; privacy?: string }>({});

function switchMode(newMode: 'login' | 'register') {
  mode.value = newMode;
  clearAllErrors();
  message.value = '';
  isError.value = false;
}
function onResetSuccess() {
  message.value = 'Passwort erfolgreich zurückgesetzt. Bitte einloggen.';
  isError.value = false;
  showReset.value = false;
}


function clearAllErrors() {
  errors.email = undefined;
  errors.password = undefined;
  errors.privacy = undefined;
}

function clearFieldError(field: 'email' | 'password' | 'privacy') {
  errors[field] = undefined;
  message.value = '';
  isError.value = false;
}

function validateBeforeSubmit(): boolean {
  clearAllErrors();
  let ok = true;

  // basic email presence check
  if (!email.value || !email.value.trim()) {
    errors.email = 'Bitte E-Mail angeben.';
    ok = false;
  } else {
    // minimal email format check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.value.trim())) {
      errors.email = 'Bitte gültige E-Mail-Adresse eingeben.';
      ok = false;
    }
  }

  // password length check
  if (!password.value) {
    errors.password = 'Bitte Passwort angeben.';
    ok = false;
  } else if (password.value.length < 8) {
    errors.password = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
    ok = false;
  }

  // privacy checkbox only for registration
  if (mode.value === 'register' && !acceptedPrivacy.value) {
    errors.privacy = 'Bitte stimmen Sie der Datenschutzerklärung zu.';
    ok = false;
  }

  return ok;
}

async function submit() {
  // Always allow the button to be clickable; we handle validation here
  message.value = '';
  isError.value = false;

  const valid = validateBeforeSubmit();

  if (!valid) {
    // show aggregated message and stop actual request
    message.value = 'Bitte die Fehler im Formular korrigieren.';
    isError.value = true;
    return;
  }

  submitting.value = true;
  try {
    if (mode.value === 'register') {
      await hw.post('/api/auth/register', { email: email.value, password: password.value });
      message.value = 'Registriert. Überprüfe dein E-Mail-Postfach und klicke auf den Bestätigungslink. Prüfe auch deinen Spam-Ordner.';
      isError.value = false;
    } else {
      const { data } = await hw.post('/api/auth/login', { email: email.value, password: password.value });
      emit('logged-in', data.token);
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
.styl {
  border-radius: 14px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}

/* --- Button Styles --- */
.btn {
  background: transparent;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Aktiver Button (ohne .ghost) */
.btn:not(.ghost) {
  background: white;
  color: #333;
}

/* Hover-Effekt für inaktive Buttons */
.btn.ghost:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Hover-Effekt für aktive Buttons */
.btn:not(.ghost):hover {
  background: #f0f0f0;
  color: #111;
}

/* --- Checkbox Styles --- */
.checkbox-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
}
.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.checkbox-container input {
  display: none;
}
.checkmark {
  height: 18px;
  width: 18px;
  border: 2px solid white;
  border-radius: 4px;
  margin-right: 8px;
  position: relative;
}
.checkbox-container input:checked ~ .checkmark {
  background-color: #3f93f8;
  border-color: #3f93f8;
}
.checkmark::after {
  content: "";
  position: absolute;
  display: none;
}
.checkbox-container input:checked ~ .checkmark::after {
  display: block;
  left: 4px;
  top: 0px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* Input basics to fit the look */
.input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: white;
  outline: none;
}
.input::placeholder {
  color: rgba(255,255,255,0.7);
}

/* small text */
.small {
  margin-left: 12px;
  font-size: 13px;
}

/* field-level error style */
.field-error {
  color: #ff7777;
  font-size: 13px;
  margin-top: 6px;
}
</style>
