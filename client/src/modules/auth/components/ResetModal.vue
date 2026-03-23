<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import hw from '@/api/hwApi';
import { Eye, EyeOff } from 'lucide-vue-next';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import { useToast } from '@/common/composables/useToast';

const emit = defineEmits(['close', 'success']);

const step = ref(1);
const email = ref('');
const code = ref('');
const password = ref('');
const password2 = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const showPassword = ref(false);
let savedResetToken = '';

const emailInputRef = ref<HTMLInputElement | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);
const passwordInputRef = ref<HTMLInputElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('close');
  }
  if (e.key === 'Enter' && !submitting.value) {
    onPrimary();
  }
}

watch(step, async () => {
  await nextTick();
  if (step.value === 1) emailInputRef.value?.focus();
  if (step.value === 2) codeInputRef.value?.focus();
  if (step.value === 3) passwordInputRef.value?.focus();
});

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  emailInputRef.value?.focus();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || 'Fehler beim Anfordern des Codes.', true);
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || 'Ungültiger oder abgelaufener Code.', true);
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
      const { data } = await hw.post('/api/auth/reset', { resetToken: savedResetToken, password: password.value });
      // MFA wurde deaktiviert
      const msg = data.message || 'Passwort erfolgreich geändert. Du kannst dich nun einloggen.';
      useToast().success(msg);
      emit('success');
      emit('close');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || 'Fehler beim Zurücksetzen des Passworts.', true);
    } finally { submitting.value = false; }
  }
}
</script>

<template>
  <div class="blurit">
    <div class="card rlc modal">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Passwort zurücksetzen</h3>
        <BaseButton @click="$emit('close')" :disabled="submitting" variant="ghost">Schließen</BaseButton>
      </div>

      <div style="margin-top:12px;">
        <div v-if="step === 1">
          <p>Gib deine registrierte E-Mail ein. Wir senden einen 6-stelligen Code.</p>
          <input ref="emailInputRef" class="input" v-model="email" placeholder="E-Mail" />
        </div>

        <div v-else-if="step === 2">
          <p>Gib den Code ein, den du per E-Mail erhalten hast.</p>
          <div style="display:flex; gap:8px;">
            <input ref="codeInputRef" class="input" v-model="code" placeholder="6-stelliger Code" style="flex-grow:1; margin-top:8px;" />
            <BaseButton @click="onBack" :disabled="submitting" style="margin-top:8px;" variant="ghost">Zurück</BaseButton>
          </div>
        </div>

        <div v-else-if="step === 3">
          <p>Gib dein neues Passwort ein (mind. 8 Zeichen) und bestätige es.</p>

          <div style="position: relative;">
            <input
                ref="passwordInputRef"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Neues Passwort"
            />
            <button
                type="button"
                @click="showPassword = !showPassword"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0; color: var(--color-on-surface);"
                aria-label="Toggle password visibility"
            >
              <component :is="showPassword ? EyeOff : Eye" :size="20" />
            </button>
          </div>

          <div style="margin-top:8px; position: relative;">
            <input
                class="input"
                :type="showPassword ? 'text' : 'password'"
                v-model="password2"
                placeholder="Neues Passwort wiederholen"
            />
            <button
                type="button"
                @click="showPassword = !showPassword"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0; color: var(--color-on-surface);"
                aria-label="Anzeigen/Nicht anzeigen"
            >
              <component :is="showPassword ? EyeOff : Eye" :size="20" />
            </button>
          </div>
        </div>

        <div v-if="message" class="small" :style="{ color: isError ? 'var(--color-danger)' : 'var(--color-primary)' }" style="margin-top:8px;">{{ message }}</div>

        <div style="margin-top:12px;" class="row">
          <BaseButton @click="onPrimary" :disabled="submitting" variant="ghost" :loading="submitting">
        {{ step === 1 ? 'Code anfordern' : step === 2 ? 'Code prüfen' : 'Passwort setzen' }}
      </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  width: 100%;
  max-width: 420px;
  padding: 16px;
  border-radius:16px;
  background: var(--color-canvas);
  color: var(--color-on-surface);
  border: 1px solid var(--color-canvas-border);
  box-shadow: var(--shadow-menu);
}

.small { font-size:13px; }
</style>