<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue';
import {
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Clock,
  AlertCircle,
  AlertTriangle,
} from '@lucide/vue';
import { useMfa } from '@/modules/auth/composables/useMfa';

const props = defineProps<{
  mfaEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'mfaChanged', enabled: boolean): void;
}>();

const {
  startMfaSetup,
  activateMfa: doActivateMfa,
  deactivateMfa: doDeactivateMfa,
} = useMfa();

// Setup State
const setupMode = ref(false);
const setupStep = ref(1);
const qrCodeUrl = ref<string | null>(null);
const manualSecret = ref<string | null>(null);
const expiresAt = ref<Date | null>(null);
const verifyCode = ref('');
const verifyError = ref<string | null>(null);
const loading = ref(false);
const copied = ref(false);

// Deactivate State
const deactivateMode = ref(false);
const deactivateCode = ref('');
const deactivateError = ref<string | null>(null);

// Input refs
const codeInput = ref<HTMLInputElement | null>(null);
const deactivateCodeInput = ref<HTMLInputElement | null>(null);

// Timer
let timerInterval: ReturnType<typeof setInterval> | null = null;
const remainingTime = ref('');

// Formatiertes Secret in vierer Gruppen
const formattedSecret = computed(() => {
  if (!manualSecret.value) return '';
  return manualSecret.value.match(/.{1,4}/g)?.join(' ') || manualSecret.value;
});

// Timer-Update Funktion
function updateTimer() {
  if (!expiresAt.value) {
    remainingTime.value = '';
    return;
  }

  const now = new Date();
  const diff = expiresAt.value.getTime() - now.getTime();

  if (diff <= 0) {
    remainingTime.value = 'Abgelaufen';
    verifyError.value = 'Setup-Zeit abgelaufen. Bitte starte erneut.';
    setTimeout(() => cancelSetup(), 2000);
    return;
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  remainingTime.value = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Setup starten
async function startSetup() {
  loading.value = true;
  verifyError.value = null;

  const result = await startMfaSetup();

  if (result) {
    qrCodeUrl.value = result.qrCode;
    manualSecret.value = result.secret;
    expiresAt.value = new Date(result.expiresAt);
    setupMode.value = true;
    setupStep.value = 1;

    // Timer starten
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  loading.value = false;
}

// Setup abbrechen
function cancelSetup() {
  setupMode.value = false;
  setupStep.value = 1;
  qrCodeUrl.value = null;
  manualSecret.value = null;
  expiresAt.value = null;
  verifyCode.value = '';
  verifyError.value = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Secret kopieren
async function copySecret() {
  if (!manualSecret.value) return;

  try {
    await navigator.clipboard.writeText(manualSecret.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = manualSecret.value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}

// Code-Input Handler nur mit Zahlen
function handleCodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  verifyCode.value = input.value;
  verifyError.value = null;
}

function handleDeactivateCodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  deactivateCode.value = input.value;
  deactivateError.value = null;
}

// MFA aktivieren
async function activateMfa() {
  if (verifyCode.value.length !== 6) return;

  loading.value = true;
  verifyError.value = null;

  const result = await doActivateMfa(verifyCode.value);

  if (result.ok) {
    cancelSetup();
    emit('mfaChanged', true);
  } else {
    verifyError.value = result.error || 'Authentifizierung fehlgeschlagen';
    verifyCode.value = '';
    await nextTick();
    codeInput.value?.focus();
  }

  loading.value = false;
}

// MFA deaktivieren starten
function startDeactivate() {
  deactivateMode.value = true;
  deactivateCode.value = '';
  deactivateError.value = null;

  nextTick(() => {
    deactivateCodeInput.value?.focus();
  });
}

// Deaktivierung abbrechen
function cancelDeactivate() {
  deactivateMode.value = false;
  deactivateCode.value = '';
  deactivateError.value = null;
}

// Deaktivierung bestätigen
async function confirmDeactivate() {
  if (deactivateCode.value.length !== 6) return;

  loading.value = true;
  deactivateError.value = null;

  const result = await doDeactivateMfa(deactivateCode.value);

  if (result.ok) {
    cancelDeactivate();
    emit('mfaChanged', false);
  } else {
    deactivateError.value = result.error || 'Authentifizierung fehlgeschlagen';
    deactivateCode.value = '';
    await nextTick();
    deactivateCodeInput.value?.focus();
  }

  loading.value = false;
}

// Cleanup
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<template>
  <div class="flex flex-col gap-5">
    <div
      class="flex items-center gap-3 p-3 bg-surface border border-surface-border shadow-input rounded-xl"
      :class="{
        '!border-[var(--special--green)] !bg-success-surface': mfaEnabled,
      }"
    >
      <div
        class="flex items-center justify-center w-11 h-11 rounded-lg bg-surface-hover text-on-ghost-muted"
        :class="{
          '!bg-success-surface !text-[var(--special--green)]': mfaEnabled,
        }"
      >
        <component :is="mfaEnabled ? ShieldCheck : ShieldOff" :size="24" />
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-sm text-on-ghost-muted"
          >Zwei-Faktor-Authentifizierung</span
        >
        <span
          class="text-base font-semibold text-on-ghost-muted"
          :class="{ '!text-[var(--special--green)]': mfaEnabled }"
        >
          {{ mfaEnabled ? 'Aktiviert' : 'Deaktiviert' }}
        </span>
      </div>
    </div>
    <p class="text-sm text-on-ghost-muted leading-[1.5] m-0 font-sans">
      Die Zwei-Faktor-Authentifizierung bietet zusätzlichen Schutz für dein
      Konto. Du benötigst dafür eine beliebige 2FA-App, wie bspw. Google
      Authenticator.
    </p>
    <div v-if="!mfaEnabled && !setupMode" class="flex justify-start">
      <BaseButton @click="startSetup" :disabled="loading" variant="action">
        2FA aktivieren
      </BaseButton>
    </div>

    <div v-if="setupMode" class="flex flex-col gap-5">
      <div class="flex items-center justify-center gap-3">
        <div
          class="flex items-center gap-2 opacity-50"
          :class="{ '!opacity-100': setupStep === 1 || setupStep > 1 }"
        >
          <span
            class="flex items-center justify-center w-6 h-6 rounded-full bg-surface-hover text-sm font-semibold text-on-ghost-muted"
            :class="{
              '!bg-action !text-on-action': setupStep === 1,
              '!bg-[var(--special--green)] !text-white': setupStep > 1,
            }"
            >1</span
          >
          <span
            class="text-sm text-on-ghost-muted"
            :class="{ '!text-on-ghost': setupStep === 1 }"
            >QR-Code scannen</span
          >
        </div>
        <div class="w-10 h-0.5 bg-surface-border"></div>
        <div
          class="flex items-center gap-2 opacity-50"
          :class="{ '!opacity-100': setupStep === 2 }"
        >
          <span
            class="flex items-center justify-center w-6 h-6 rounded-full bg-surface-hover text-sm font-semibold text-on-ghost-muted"
            :class="{ '!bg-action !text-on-action': setupStep === 2 }"
            >2</span
          >
          <span
            class="text-sm text-on-ghost-muted"
            :class="{ '!text-on-ghost': setupStep === 2 }"
            >Code eingeben</span
          >
        </div>
      </div>

      <!-- Step 1 -->
      <div v-if="setupStep === 1" class="flex flex-col gap-4">
        <p
          class="text-sm text-on-ghost-muted leading-[1.5] m-0 text-center font-sans"
        >
          Bitte scanne den QR-Code mit deiner Authenticator-App (z.B. Google
          Authenticator).
        </p>

        <div
          v-if="qrCodeUrl"
          class="flex justify-center p-2 bg-white rounded-xl mx-auto"
        >
          <img :src="qrCodeUrl" alt="MFA QR-Code" class="w-[200px] h-[200px]" />
        </div>

        <div v-if="manualSecret" class="flex flex-col gap-2 items-center">
          <p class="text-sm text-on-ghost-muted m-0">
            Oder gib diesen Code manuell ein:
          </p>
          <div
            class="flex items-center gap-2 p-1 bg-surface border border-surface-border shadow-input rounded-lg"
          >
            <code
              class="font-mono text-sm text-on-ghost tracking-[4px] pl-2 py-1.5"
              >{{ formattedSecret }}</code
            >
            <button
              type="button"
              class="flex items-center justify-center p-2 bg-none border-none text-on-ghost-muted cursor-pointer rounded-lg transition-all hover:bg-surface-hover hover:text-on-ghost"
              @click="copySecret"
              :title="copied ? 'Kopiert!' : 'Kopieren'"
            >
              <component :is="copied ? Check : Copy" :size="16" />
            </button>
          </div>
        </div>

        <div
          class="flex items-center justify-center gap-1.5 text-sm text-on-ghost-muted font-sans"
          v-if="expiresAt"
        >
          <Clock :size="16" />
          <span>Gültig für {{ remainingTime }}</span>
        </div>

        <div class="flex justify-end gap-3 mt-2">
          <BaseButton @click="cancelSetup" variant="ghost"
            >Abbrechen</BaseButton
          >
          <BaseButton @click="setupStep = 2" variant="action"
            >Weiter</BaseButton
          >
        </div>
      </div>

      <!-- Step 2 -->
      <div v-if="setupStep === 2" class="flex flex-col gap-4">
        <p
          class="text-sm text-on-ghost-muted leading-[1.5] m-0 text-center font-sans"
        >
          Gib den 6-stelligen Code aus deiner Authenticator-App ein, um die
          Einrichtung abzuschließen.
        </p>

        <div class="flex justify-center">
          <input
            ref="codeInput"
            v-model="verifyCode"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            placeholder="000000"
            class="w-[180px] p-3 text-3xl font-mono text-center bg-surface border border-surface-border shadow-input rounded-xl text-on-ghost transition-colors focus:outline-none focus:border-on-ghost"
            :class="{ '!border-danger': verifyError }"
            @input="handleCodeInput"
            @keyup.enter="activateMfa"
          />
        </div>

        <div
          v-if="verifyError"
          class="flex items-center justify-center gap-1.5 text-sm text-danger"
        >
          <AlertCircle :size="14" />
          {{ verifyError }}
        </div>

        <div class="flex justify-end gap-3 mt-2">
          <BaseButton @click="setupStep = 1" variant="ghost">Zurück</BaseButton>
          <BaseButton
            @click="activateMfa"
            :disabled="verifyCode.length !== 6 || loading"
            variant="action"
            :loading="loading"
          >
            Aktivieren
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Deaktivieren Option -->
    <div v-if="mfaEnabled && !deactivateMode" class="flex justify-start">
      <BaseButton
        class="border border-danger text-danger hover:bg-danger-hover"
        @click="startDeactivate"
        :icon="ShieldOff"
      >
        2FA deaktivieren
      </BaseButton>
    </div>

    <!-- Deaktivieren Mode -->
    <div v-if="deactivateMode" class="flex flex-col gap-4">
      <div
        class="flex gap-3 p-3 px-4 bg-danger-hover border border-danger rounded-lg text-danger"
      >
        <AlertTriangle :size="20" class="flex-shrink-0 mt-0.5" />
        <p class="m-0 text-sm leading-[1.4]">
          Indem du fortfährst verringerst du die Sicherheit deines Kontos. Um
          die Deaktivierung abzuschließen, must du noch ein letztes Mal den
          korrekten Code eingeben
        </p>
      </div>

      <div class="flex justify-center">
        <input
          ref="deactivateCodeInput"
          v-model="deactivateCode"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="6"
          placeholder="000000"
          class="w-[180px] p-3 text-3xl font-mono text-center bg-surface border border-surface-border shadow-input rounded-xl text-on-ghost transition-colors focus:outline-none focus:border-on-ghost"
          :class="{ '!border-danger': deactivateError }"
          @input="handleDeactivateCodeInput"
          @keyup.enter="confirmDeactivate"
        />
      </div>

      <div
        v-if="deactivateError"
        class="flex items-center justify-center gap-1.5 text-sm text-danger"
      >
        <AlertCircle :size="14" />
        {{ deactivateError }}
      </div>

      <div class="flex justify-end gap-3 mt-2">
        <BaseButton @click="cancelDeactivate" variant="ghost"
          >Abbrechen</BaseButton
        >
        <BaseButton
          @click="confirmDeactivate"
          :disabled="deactivateCode.length !== 6 || loading"
          variant="danger"
          :loading="loading"
        >
          Deaktivieren
        </BaseButton>
      </div>
    </div>
  </div>
</template>
