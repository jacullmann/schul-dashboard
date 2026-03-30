<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits(['cancel', 'success']);

const step = ref(1);
const email = ref('');
const code = ref('');
const password = ref('');
const password2 = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
let savedResetToken = '';

const emailInputRef = ref<HTMLInputElement | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);
const passwordInputRef = ref<HTMLInputElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('cancel');
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

useEventListener(window, 'keydown', onKeyDown);

onMounted(() => {
  emailInputRef.value?.focus();
});

function setMessage(txt: string, error = false) {
  message.value = txt;
  isError.value = error;
}

function onBack() {
  if (step.value === 2) {
    step.value = 1;
    setMessage('');
    code.value = '';
  }
}

async function onPrimary() {
  setMessage('');
  if (step.value === 1) {
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
      const msg = data.message || 'Passwort erfolgreich geändert. Du kannst dich nun einloggen.';
      useToast().success(msg);
      emit('success');
      emit('cancel');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || 'Fehler beim Zurücksetzen des Passworts.', true);
    } finally { submitting.value = false; }
  }
}
</script>

<template>
  <BaseModal @cancel="emit('cancel')">
    <template #title>
      Passwort zurücksetzen
    </template>

    <template #content>
      <div v-if="step === 1">
        <p>Gib deine registrierte E-Mail ein. Wir senden einen 6-stelligen Code.</p>
        <BaseInput id="reset-email" ref="emailInputRef" v-model="email" placeholder="E-Mail" />
      </div>

      <div v-else-if="step === 2">
        <p>Gib den Code ein, den du per E-Mail erhalten hast.</p>
        <div style="display:flex; gap:8px;">
          <BaseInput id="reset-code" ref="codeInputRef" v-model="code" placeholder="6-stelliger Code" style="flex-grow:1; margin-top:8px;" />
          <BaseButton @click="onBack" :disabled="submitting" style="margin-top:8px;" variant="ghost">{{ t('global.buttons.back') }}</BaseButton>
        </div>
      </div>

      <div v-else-if="step === 3">
        <p>Gib dein neues Passwort ein (mind. 8 Zeichen) und bestätige es.</p>

        <div style="position: relative;">
          <BaseInput
              id="reset-password"
              ref="passwordInputRef"
              type="password"
              v-model="password"
              placeholder="Neues Passwort"
          />
        </div>

        <div style="margin-top:8px; position: relative;">
          <BaseInput
              id="reset-password-confirm"
              type="password"
              v-model="password2"
              placeholder="Neues Passwort wiederholen"
          />
        </div>
      </div>

      <div v-if="message" class="text-sub" :style="{ color: isError ? 'var(--color-danger)' : 'var(--color-primary)' }" style="margin-top:8px;">{{ message }}</div>
    </template>

    <template #action-btn>
      <BaseButton type="submit" @click="onPrimary" :disabled="submitting" variant="action" :loading="submitting">
        {{ step === 1 ? 'Code anfordern' : step === 2 ? 'Code prüfen' : 'Passwort setzen' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
