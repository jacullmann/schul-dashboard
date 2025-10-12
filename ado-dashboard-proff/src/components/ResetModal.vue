<template>
  <div class="card overlay">
    <div class="card modal">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Passwort zurücksetzen</h3>
        <button data-umami-event="Passwort zurücksetzen Abbruch" class="btn ghost" @click="$emit('close')" :disabled="submitting">Schließen</button>
      </div>

      <div style="margin-top:12px;">
        <div v-if="step === 1">
          <p>Gib deine registrierte E-Mail ein. Wir senden einen 6-stelligen Code.</p>
          <input class="input" v-model="email" placeholder="E-Mail" />
        </div>

        <div v-else-if="step === 2">
          <p>Gib den Code ein, den du per E-Mail erhalten hast.</p>
          <div style="display:flex; gap:8px;">
            <input class="input" v-model="code" placeholder="6-stelliger Code" style="flex-grow:1; margin-top:8px;" />
            <button class="btn ghost" @click="onBack" :disabled="submitting" style="margin-top:8px;">Zurück</button>
          </div>
        </div>

        <div v-else-if="step === 3">
          <p>Gib dein neues Passwort ein (mind. 8 Zeichen) und bestätige es.</p>
          <input class="input" type="password" v-model="password" placeholder="Neues Passwort" />
          <input class="input" type="password" v-model="password2" placeholder="Neues Passwort wiederholen" style="margin-top:8px;" />
        </div>

        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)' : 'var(--primary)' }" style="margin-top:8px;">{{ message }}</div>

        <div style="margin-top:12px; display:flex; gap:8px;">
          <button data-umami-event="Passwort zurücksetzen weiter" class="btn" @click="onPrimary" :disabled="submitting">
            <span v-if="submitting">Bitte warten…</span>
            <span v-else>{{ step === 1 ? 'Code anfordern' : step === 2 ? 'Code prüfen' : 'Passwort setzen' }}</span>
          </button>
          <button  class="btn ghost" @click="$emit('close')" :disabled="submitting">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../hwApi';

const emit = defineEmits(['close', 'success']);

const step = ref(1);
const email = ref('');
const code = ref('');
const password = ref('');
const password2 = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
let savedResetToken = ''; // holds resetToken from verify endpoint

function setMessage(txt: string, error = false) {
  message.value = txt;
  isError.value = error;
}

// NEUE FUNKTION: Zurück zu Schritt 1 (E-Mail)
function onBack() {
  if (step.value === 2) {
    step.value = 1;
    setMessage(''); // Nachricht leeren
    code.value = ''; // Code-Feld leeren
  }
}

async function onPrimary() {
  setMessage('');
  if (step.value === 1) {
    // request code
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setMessage('Bitte gültige E-Mail eingeben.', true);
      return;
    }
    submitting.value = true;
    try {
      await hw.post('/api/auth/forgot', { email: email.value });
      setMessage('Wenn die E-Mail existiert, wurde ein Code versendet.', false);
      step.value = 2;
    } catch (e:any) {
      setMessage(e?.response?.data?.error || 'Fehler beim Anfordern des Codes.', true);
    } finally { submitting.value = false; }
  } else if (step.value === 2) {
    if (!code.value || code.value.trim().length !== 6) {
      setMessage('Bitte 6-stelligen Code eingeben.', true);
      return;
    }
    submitting.value = true;
    try {
      const { data } = await hw.post('/api/auth/reset/verify', { email: email.value, code: code.value.trim() });
      savedResetToken = data.resetToken;
      setMessage('Code bestätigt. Bitte neues Passwort eingeben.', false);
      step.value = 3;
    } catch (e:any) {
      setMessage(e?.response?.data?.error || 'Ungültiger oder abgelaufener Code.', true);
    } finally { submitting.value = false; }
  } else if (step.value === 3) {
    if (!password.value || password.value.length < 8) {
      setMessage('Passwort muss mindestens 8 Zeichen lang sein.', true);
      return;
    }
    if (password.value !== password2.value) {
      setMessage('Passwörter stimmen nicht überein.', true);
      return;
    }
    if (!savedResetToken) {
      setMessage('Kein gültiger Reset-Token vorhanden. Bitte den Code erneut anfordern.', true);
      step.value = 1;
      return;
    }
    submitting.value = true;
    try {
      await hw.post('/api/auth/reset', { resetToken: savedResetToken, password: password.value });
      setMessage('Passwort erfolgreich geändert. Du kannst dich nun einloggen.', false);
      emit('success');
      setTimeout(() => emit('close'), 800);
    } catch (e:any) {
      setMessage(e?.response?.data?.error || 'Fehler beim Zurücksetzen des Passworts.', true);
    } finally { submitting.value = false; }
  }
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; z-index:120; background: rgba(0,0,0,0.5); }
.modal { width: 100%; max-width: 420px; padding: 18px; border-radius:12px; background: rgba(0,0,0,1);; color: white; border:1px solid rgba(255,255,255,0.08); }
.input { width:100%; margin-top:8px; padding:8px 10px; border-radius:8px; background: rgba(255,255,255,0.03); color:white; border:1px solid rgba(255,255,255,0.06); }
.small { font-size:13px; }
</style>