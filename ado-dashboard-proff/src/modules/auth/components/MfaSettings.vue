<template>
  <div class="mfa-settings">
    <div class="status-card" :class="{ enabled: mfaEnabled }">
      <div class="status-icon">
        <component :is="mfaEnabled ? ShieldCheck : ShieldOff" :size="24" />
      </div>
      <div class="status-info">
        <span class="status-label">Zwei-Faktor-Authentifizierung</span>
        <span class="status-value" :class="{ enabled: mfaEnabled }">
          {{ mfaEnabled ? 'Aktiviert' : 'Deaktiviert' }}
        </span>
      </div>
    </div>
    <p class="description">
      Die Zwei-Faktor-Authentifizierung bietet zusätzlichen Schutz für dein Konto. Du benötigst dafür eine beliebige 2FA-App, wie bspw. Google Authenticator.
    </p>
    <div v-if="!mfaEnabled && !setupMode" class="action-section">
      <button
          class="btn action"
          @click="startSetup"
          :disabled="loading"
      >
        2FA aktivieren
      </button>
    </div>

    <div v-if="setupMode" class="setup-section">
      <div class="setup-steps">
        <div class="step" :class="{ active: setupStep === 1, completed: setupStep > 1 }">
          <span class="step-number">1</span>
          <span class="step-label">QR-Code scannen</span>
        </div>
        <div class="step-divider"></div>
        <div class="step" :class="{ active: setupStep === 2 }">
          <span class="step-number">2</span>
          <span class="step-label">Code eingeben</span>
        </div>
      </div>

      <!-- Step 1 -->
      <div v-if="setupStep === 1" class="qr-section">
        <p class="instruction">
          Bitte scanne den QR-Code mit deiner Authenticator-App
          (z.B. Google Authenticator).
        </p>

        <div v-if="qrCodeUrl" class="qr-container">
          <img :src="qrCodeUrl" alt="MFA QR-Code" class="qr-image" />
        </div>

        <div v-if="manualSecret" class="manual-entry">
          <p class="manual-label">Oder gib diesen Code manuell ein:</p>
          <div class="secret-display">
            <code class="secret-code">{{ formattedSecret }}</code>
            <button
                type="button"
                class="copy-btn"
                @click="copySecret"
                :title="copied ? 'Kopiert!' : 'Kopieren'"
            >
              <component :is="copied ? Check : Copy" :size="16" />
            </button>
          </div>
        </div>

        <div class="timer-info" v-if="expiresAt">
          <Clock :size="16" />
          <span>Gültig für {{ remainingTime }}</span>
        </div>

        <div class="step-actions">
          <button class="btn ghost" @click="cancelSetup">Abbrechen</button>
          <button class="btn action" @click="setupStep = 2">Weiter</button>
        </div>
      </div>

      <!-- Step 2 -->
      <div v-if="setupStep === 2" class="verify-section">
        <p class="instruction">
          Gib den 6-stelligen Code aus deiner Authenticator-App ein,
          um die Einrichtung abzuschließen.
        </p>

        <div class="code-input-wrapper">
          <input
              ref="codeInput"
              v-model="verifyCode"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              placeholder="000000"
              class="code-input"
              :class="{ error: verifyError }"
              @input="handleCodeInput"
              @keyup.enter="activateMfa"
          />
        </div>

        <div v-if="verifyError" class="error-message">
          <AlertCircle :size="14" />
          {{ verifyError }}
        </div>

        <div class="step-actions">
          <button class="btn ghost" @click="setupStep = 1">Zurück</button>
          <button
              class="btn action"
              @click="activateMfa"
              :disabled="verifyCode.length !== 6 || loading"
          >
            <LoadingSpinner v-if="loading" color="white" size="1.2em" />
            <span v-else>Aktivieren</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Deaktivieren Option -->
    <div v-if="mfaEnabled && !deactivateMode" class="action-section">
      <button
          class="btn danger-outline"
          @click="startDeactivate"
      >
        <ShieldOff :size="18" />
        2FA deaktivieren
      </button>
    </div>

    <!-- Deaktivieren Mode -->
    <div v-if="deactivateMode" class="deactivate-section">
      <div class="warning-box">
        <AlertTriangle :size="20" />
        <p>
          Indem du fortfährst verringerst du die Sicherheit deines Kontos.
          Um die Deaktivierung abzuschließen, must du noch ein letztes Mal den korrekten Code eingeben
        </p>
      </div>

      <div class="code-input-wrapper">
        <input
            ref="deactivateCodeInput"
            v-model="deactivateCode"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            placeholder="000000"
            class="code-input"
            :class="{ error: deactivateError }"
            @input="handleDeactivateCodeInput"
            @keyup.enter="confirmDeactivate"
        />
      </div>

      <div v-if="deactivateError" class="error-message">
        <AlertCircle :size="14" />
        {{ deactivateError }}
      </div>

      <div class="step-actions">
        <button class="btn ghost" @click="cancelDeactivate">Abbrechen</button>
        <button
            class="btn danger"
            @click="confirmDeactivate"
            :disabled="deactivateCode.length !== 6 || loading"
        >
          <LoadingSpinner v-if="loading" color="white" size="1.2em" />
          <span v-else>Deaktivieren</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue';
import {
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Clock,
  AlertCircle,
  AlertTriangle
} from 'lucide-vue-next';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';

const props = defineProps<{
  mfaEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'mfaChanged', enabled: boolean): void;
}>();

const { startMfaSetup, activateMfa: doActivateMfa, deactivateMfa: doDeactivateMfa } = useMfa();

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
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = manualSecret.value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
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

<style scoped>
.mfa-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
}

.status-card.enabled {
  border-color: var(--special--green);
  background: var(--special--green--background);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--gg);
  color: var(--sub);
}

.status-card.enabled .status-icon {
  background: var(--special--green--background);
  color: var(--special--green);
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

.status-value {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--sub);
}

.status-value.enabled {
  color: var(--special--green);
}

.description {
  font-size: var(--font-size-sub);
  color: var(--sub);
  line-height: 1.5;
  margin: 0;
  font-family: var(--normal-font), sans-serif;
}

.action-section {
  display: flex;
  justify-content: flex-start;
}

.action-section .btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Setup Section */
.setup-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
}

.step.active,
.step.completed {
  opacity: 1;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gg);
  font-size: var(--font-size-sub);
  font-weight: 600;
  color: var(--sub);
}

.step.active .step-number {
  background: var(--text);
  color: var(--bg);
}

.step.completed .step-number {
  background: var(--special--green);
  color: white;
}

.step-label {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

.step.active .step-label {
  color: var(--text);
}

.step-divider {
  width: 40px;
  height: 2px;
  background: var(--border2);
}

.qr-section,
.verify-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.instruction {
  font-size: var(--font-size-sub);
  color: var(--sub);
  line-height: 1.5;
  margin: 0;
  text-align: center;
  font-family: var(--normal-font), sans-serif;;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 8px;
  background: #fff;
  border-radius: 12px;
  margin: 0 auto;
}

.qr-image {
  width: 200px;
  height: 200px;
}

.manual-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.manual-label {
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin: 0;
}

.secret-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 8px;
}

.secret-code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: var(--font-size-sub);
  color: var(--text);
  letter-spacing: 4px;
  padding-left: 8px;
  padding-block: 6px;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: none;
  border: none;
  color: var(--sub);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--gg);
  color: var(--text);
}

.timer-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-size-sub);
  color: var(--sub);
  font-family: var(--normal-font), sans-serif;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.code-input-wrapper {
  display: flex;
  justify-content: center;
}

.code-input {
  width: 180px;
  padding: 12px;
  font-size: 24px;
  font-family: 'SF Mono', Monaco, monospace;
  letter-spacing: 8px;
  text-align: center;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  color: var(--text);
  transition: border-color 0.2s;
}

.code-input:focus {
  outline: none;
  border-color: var(--text);
}

.code-input.error {
  border-color: var(--danger);
}

.code-input::placeholder {
  color: var(--border2);
  letter-spacing: 8px;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-size-sub);
  color: var(--danger);
}

.deactivate-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-box {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: var(--special--red--background);
  border: 1px solid var(--special--red);
  border-radius: 10px;
  color: var(--special--red);
}

.warning-box p {
  margin: 0;
  font-size: var(--font-size-sub);
  line-height: 1.4;
}

.warning-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.btn.danger-outline {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
}

.btn.danger-outline:hover {
  background: var(--special--red--background);
}

.btn.danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.btn.danger:hover {
  opacity: 0.9;
}

@media (max-width: 480px) {
  .setup-steps {
    flex-wrap: wrap;
  }

  .step-divider {
    display: none;
  }

  .code-input {
    width: 100%;
    max-width: 200px;
  }
}
</style>