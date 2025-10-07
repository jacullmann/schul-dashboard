<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card styl" style="width:100%; max-width:420px;">

      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; color:white;">{{ mode==='login' ? 'Anmelden' : 'Registrieren' }}</h3>
        <button class="btn ghost" style="color:white;" @click="$emit('close')">Schließen</button>
      </div>

      <!-- Tabs -->
      <div class="row" style="margin-top:12px;">
        <button class="btn" :class="{ ghost: mode!=='login' }" @click="mode='login'">Login</button>
        <button class="btn"  :class="{ ghost: mode!=='register' }" @click="mode='register'">Registrieren</button>
      </div>

      <!-- Inputs -->
      <div style="margin-top:12px;">
        <input class="input" v-model="email" placeholder="E-Mail" />
      </div>
      <div style="margin-top:8px; position:relative;">
        <input class="input" type="password" v-model="password" placeholder="Passwort (min. 8 Zeichen)" />
        <div v-if="pwError" class="field-error">{{ pwError }}</div>
      </div>

      <!-- Datenschutzerklärung Checkbox -->
      <div v-if="mode==='register'" class="checkbox-row">
        <label class="checkbox-container">
          <input type="checkbox" v-model="acceptedPrivacy" />
          <span class="checkmark"></span>
          <span style="color:white; font-size:14px;">
            Ich stimme der <a href="/impressum-&-datenschutz/impressum" target="_blank" style="color:#3f93f8; text-decoration:underline;">Datenschutzerklärung und AGB</a> zu
          </span>
        </label>
      </div>
      <div v-if="privacyError" class="field-error" style="margin-top:6px;">{{ privacyError }}</div>

      <!-- Submit -->
      <div class="row" style="margin-top:12px; align-items:center;">
        <button class="btn" @click="submit" :disabled="submitting || (mode==='register' && !acceptedPrivacy)">
          <svg v-if="submitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ mode==='login' ? 'Anmelden' : 'Registrieren' }}
        </button>
        <div style="margin-left:12px;">
          <div v-if="message" class="small" :class="{ 'msg-error': isError, 'msg-ok': !isError }">{{ message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import hw from '../../hwApi';

const emit = defineEmits<{ (e: 'close'): void; (e: 'logged-in', token: string): void }>();

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const acceptedPrivacy = ref(false);

// Field-specific errors
const pwError = ref('');
const privacyError = ref('');

// Clear field errors when user edits inputs
watch(password, () => { pwError.value = ''; message.value = ''; isError.value = false; });
watch(acceptedPrivacy, () => { privacyError.value = ''; message.value = ''; isError.value = false; });

function validateBeforeRegister() {
  pwError.value = '';
  privacyError.value = '';
  message.value = '';
  isError.value = false;

  if (password.value.length < 8) {
    pwError.value = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
  }
  if (!acceptedPrivacy.value) {
    privacyError.value = 'Sie müssen der Datenschutzerklärung und AGB zustimmen.';
  }

  return !pwError.value && !privacyError.value;
}

async function submit() {
  submitting.value = true;
  // reset generic message
  message.value = '';
  isError.value = false;

  try {
    if (mode.value === 'register') {
      // Client-side validation
      if (!validateBeforeRegister()) {
        isError.value = true;
        return;
      }

      // proceed to API
      await hw.post('/api/auth/register', { email: email.value, password: password.value });
      message.value = 'Registriert. Bitte E-Mail prüfen und Link anklicken.';
      isError.value = false;
    } else {
      const { data } = await hw.post('/api/auth/login', { email: email.value, password: password.value });
      emit('logged-in', data.token);
    }
  } catch (e: any) {
    // If backend returns a specific password error, show friendly message
    const backendError = e.response?.data?.error || '';
    // Map common backend messages to friendly text (fallback to backend message)
    if (backendError.toLowerCase().includes('password') && backendError.match(/\d/)) {
      // backend might say e.g. "password too short"
      pwError.value = 'Das Passwort ist zu kurz. Mindestens 8 Zeichen erforderlich.';
      isError.value = true;
      message.value = '';
    } else if (backendError) {
      message.value = backendError;
      isError.value = true;
    } else {
      message.value = 'Unbekannter Fehler';
      isError.value = true;
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.styl {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}

/* --- Button Styles --- */
.btn {
  background: transparent;
  color: white;
  border: 1px solid white;
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
  background: #f0f0f0; /* leichtes Grau */
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

/* --- Error / Message Styles --- */
.small {
  font-size: 13px;
}

/* Generic message styles */
.msg-error {
  color: var(--danger, #ff6666);
}
.msg-ok {
  color: var(--primary, #3f93f8);
}

/* Field-level error (under input / checkbox) */
.field-error {
  color: #ffb4b4;
  background: rgba(255, 0, 0, 0.06);
  border: 1px solid rgba(255, 0, 0, 0.08);
  padding: 6px 8px;
  border-radius: 6px;
  margin-top: 6px;
  font-size: 13px;
  max-width: 100%;
}

/* Input basic appearance (keeps original look) */
.input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: white;
  outline: none;
}

/* Show red border on invalid password when user typed but invalid */
.input:focus + .field-error {}

/* Disabled button look */
.btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
