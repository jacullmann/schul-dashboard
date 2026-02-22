<template>
  <div class="blurit">
    <div class="modal-wrapper">
      <div class="card rlc modal-card">
        <div class="modal-header">
          <div class="header-icon">
            <ShieldCheck :size="28" />
          </div>
          <h3 class="modal-title">Zwei-Faktor-Authentifizierung</h3>
        </div>

        <div class="modal-body">
          <p class="instruction">
            Gib den 6-stelligen Code aus deiner Authenticator-App ein,
            um die fortzufahren.
          </p>

          <div class="code-input-wrapper">
            <input
                ref="codeInputRef"
                v-model="code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                placeholder="000000"
                class="code-input"
                :class="{ error: error, shake: shakeInput }"
                :disabled="loading"
                @input="handleInput"
                @keyup.enter="verify"
            />
          </div>

          <transition name="fade">
            <div v-if="error" class="error-message">
              <AlertCircle :size="14" />
              {{ error }}
            </div>
          </transition>

          <div v-if="attemptsRemaining !== null && attemptsRemaining <= 3" class="attempts-warning">
            <AlertTriangle :size="14" />
            Noch {{ attemptsRemaining }} Versuche
          </div>
        </div>

        <div class="modal-actions">
          <button
              class="btn ghost"
              @click="cancel"
              :disabled="loading"
          >
            Abbrechen
          </button>
          <button
              class="btn action"
              @click="verify"
              :disabled="code.length !== 6 || loading"
          >
            <LoadingSpinner v-if="loading" color="white" size="1.2em" />
            <span v-else>Bestätigen</span>
          </button>
        </div>

        <div class="modal-footer">
          <p class="help-text">
            Du hast Probleme, die 2-Faktor-Authentifizierung abzuschließen?
            <br />
            <a href="mailto:kontakt@schul-dashboard.com" class="help-link">
              Kontaktiere uns gerne über den Support
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-vue-next';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';

const emit = defineEmits<{
  (e: 'verified', csrfToken: string): void;
  (e: 'cancelled'): void;
}>();

const { verifyMfaLogin, cancelMfaLogin } = useMfa();

const code = ref('');
const error = ref<string | null>(null);
const loading = ref(false);
const shakeInput = ref(false);
const attemptsRemaining = ref<number | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  code.value = input.value;
  error.value = null;
  if (code.value.length === 6) {
    verify();
  }
}

// Verifizieren
async function verify() {
  if (code.value.length !== 6 || loading.value) return;

  loading.value = true;
  error.value = null;

  const result = await verifyMfaLogin(code.value);

  if (result.ok) {
    emit('verified', result.csrfToken || '');
  } else {
    if (result.error?.includes('fehlgeschlagen') || result.error?.includes('expired')) {
      error.value = 'Sitzung abgelaufen. Bitte erneut anmelden.';
      setTimeout(() => emit('cancelled'), 2000);
    } else {
      error.value = result.error || 'Authentifizierung fehlgeschlagen';
    }
    code.value = '';
    shakeInput.value = true;
    setTimeout(() => { shakeInput.value = false; }, 500);
    await nextTick();
    codeInputRef.value?.focus();
  }

  loading.value = false;
}

// Abbrechen
async function cancel() {
  await cancelMfaLogin();
  emit('cancelled');
}

// Direkt Fokus
onMounted(() => {
  nextTick(() => {
    codeInputRef.value?.focus();
  });
});
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
  max-width: 380px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--lbg);
  padding: 24px;
  box-shadow: var(--shadow-l);
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--special--green--background);
  color: var(--special--green);
}

.modal-title {
  margin: 0;
  color: var(--text);
  font-size: var(--font-size-h3);
  font-weight: 700;
  text-align: center;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.instruction {
  font-size: var(--font-size-sub);
  color: var(--sub);
  line-height: 1.5;
  margin: 0;
  text-align: center;
}

.code-input-wrapper {
  display: flex;
  justify-content: center;
}

.code-input {
  width: 180px;
  padding: 14px 16px;
  font-size: 28px;
  font-family: 'SF Mono', Monaco, monospace;
  letter-spacing: 10px;
  text-align: center;
  background: var(--vlbg);
  border: 2px solid var(--border2);
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

.code-input.shake {
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}

.code-input::placeholder {
  color: var(--border2);
  letter-spacing: 10px;
}

.code-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-size-sub);
  color: var(--danger);
}

.attempts-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-size-sub);
  color: var(--special--red);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-actions .btn {
  min-width: 100px;
  justify-content: center;
}

.modal-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.help-text {
  font-size: var(--font-size-footnote);
  color: var(--sub);
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

.help-link {
  color: var(--text);
  text-decoration: underline;
  transition: opacity 0.2s;
}

.help-link:hover {
  opacity: 0.8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 400px) {
  .modal-card {
    padding: 20px;
  }

  .code-input {
    width: 100%;
    max-width: 200px;
    font-size: 24px;
    letter-spacing: 8px;
  }
}
</style>