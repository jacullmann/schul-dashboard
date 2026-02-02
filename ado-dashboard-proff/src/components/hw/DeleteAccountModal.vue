<template>
  <div class="blurit" @click.self="handleBackdropClick">
    <div class="card rlc modal">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Account löschen</h3>
        <button
            data-umami-event="Account löschen Modal schließen"
            class="btn ghost"
            @click="$emit('close')"
            :disabled="submitting"
        >
          Schließen
        </button>
      </div>

      <div style="margin-top:16px; font-family: var(--normal-font), sans-serif;">
        <div class="warning-box">
          <strong style="font-family: var(--normal-font), sans-serif; font-size: var(--font-size-title)">Account unwiderruflich löschen?</strong>
          <div class="user-email">E-Mail: {{ email }}</div>
          <br>
          <div class="warning-text">
            Wenn du dein Konto löschst, wird dieses mitsamt all deinen Einstellungen unwiderruflich entfernt. Allerdings bleiben hochgeladene Einträge, Bilder oder Ankündigungen erhalten. Falls du diese ebenfalls entfernen willst, musst du diese manuell löschen, bevor dein Konto geschlossen wird.
            <br><br>
            Du kannst jederzeit einneues Konto erstellen, aber vorherig hinzugefügte Inhalte sind dann nicht mehr mit deinem Konto verknüpft, sodass du nicht mehr auf sie zugreifen kannst.
          </div>
        </div>

        <label class="collapse-checkbox">
          <input
              type="checkbox"
              v-model="understoodChecked"
          >
          <span class="vis-label"></span>
          <span class="checkbox-text">Ich verstehe, dass ich hiermit mein Konto unwiderruflich lösche.</span>
        </label>

        <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>
        <div v-if="successMsg" class="message success">{{ successMsg }}</div>

        <div class="action-buttons row">
          <button
              class="btn ghost"
              @click="$emit('close')"
              :disabled="submitting"
          >
            Abbrechen
          </button>
          <button
              data-umami-event="Account löschen Bestätigung"
              class="btn danger"
              @click="confirmDelete"
              :disabled="submitting || !understoodChecked"
          >
            <LoadingSpinner v-if="submitting" size="1.1em" />
            <span v-else>Account Löschen</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import hw from '../../hwApi';
import LoadingSpinner from '../LoadingSpinner.vue';

const props = defineProps<{
  email: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'deleted'): void;
  (e: 'error', msg: string): void;
}>();

const understoodChecked = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function handleBackdropClick() {
  if (!submitting.value) {
    emit('close');
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

async function confirmDelete() {
  submitting.value = true;
  errorMsg.value = '';
  try {
    const res = await hw.delete('/api/auth/me');
    if (res?.data?.ok) {
      successMsg.value = 'Account wurde gelöscht.';
      emit('deleted');
      setTimeout(() => emit('close'), 600);
    } else {
      const err = res?.data?.error || 'Unbekannter Fehler';
      errorMsg.value = err;
      emit('error', err);
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || 'Fehler beim Löschen';
    errorMsg.value = msg;
    emit('error', msg);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.modal {
  width: 100%;
  max-width: 480px;
  padding: 16px;
  border-radius: 16px;
  background: var(--lbg);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-l);
}

.warning-box {
  background: rgba(246, 82, 82, 0.08);
  border: 1px solid rgba(246, 82, 82, 0.3);
  border-radius: 12px;
  padding: 12px;
}

.warning-box strong {
  color: var(--special--red);
  display: block;
  margin-bottom: 8px;
}

.user-email {
  font-size: var(--font-size-sub);
  color: var(--text);
  font-weight: 700;
}

.warning-text {
  font-size: var(--font-size-sub);
  color: var(--text);
  line-height: 1.5;
}

.collapse-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin-top: 16px;
  gap: 10px;
}

.collapse-checkbox input {
  display: none;
}

.collapse-checkbox .vis-label {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border-radius: 4px;
  border: 2px solid var(--sub);
  display: inline-block;
  background: transparent;
  position: relative;
  flex-shrink: 0;
}

.collapse-checkbox input:checked + .vis-label {
  background: var(--text);
  border-color: var(--text);
}

.collapse-checkbox .vis-label:hover {
  border-color: var(--text);
}

.collapse-checkbox .vis-label::after {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: solid var(--lbg);
  border-width: 0 2px 2px 0;
  opacity: 0;
  left: 50%;
  top: 32%;
  transform: translate(-50%, -30%) rotate(70deg);
  transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1), height 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.collapse-checkbox input:checked + .vis-label::after {
  opacity: 1;
  width: 5px;
  height: 10px;
  transform: translate(-50%, -45%) rotate(45deg);
}

.checkbox-text {
  font-size: var(--font-size-sub);
  color: var(--text);
  user-select: none;
}

.action-buttons {
  margin-top: 16px;
}

.message {
  font-size: var(--font-size-sub);
  padding: 10px 12px;
  border-radius: var(--border-4);
  text-align: center;
  margin-top: 16px;
}

.message.error {
  background: var(--special--red--background);
  color: var(--special--red);
}

.message.success {
  background: var(--special--green--background);
  color: var(--special--green);
}

@media (max-width: 480px) {
  .modal {
    max-width: 92vw;
    padding: 16px;
  }
}
</style>