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

      <div style="margin-top:16px;">
        <div class="warning-box">
          <strong>Account unwiderruflich löschen?</strong>
          <div class="user-email">E-Mail: {{ email }}</div>
          <div class="warning-text">
            Wenn du deinen Account löschst, wird dieser mitsamt all deinen Einstellungen unwiderruflich entfernt. Allerdings bleiben hochgeladene Einträge, Bilder oder Ankündigungen erhalten. Falls du diese ebenfalls entfernen willst, musst du diese manuell löschen, bevor dein Account geschlossen wird.
            <br><br>
            Du kannst jederzeit einen neuen Account erstellen, aber vorherig hinzugefügte Inhalte sind dann nicht mehr mit deinem Account verknüpft, sodass du nicht mehr auf sie zugreifen kannst.
          </div>
        </div>

        <label class="checkbox-label">
          <input
              type="checkbox"
              v-model="understoodChecked"
              class="checkbox-input"
          >
          <span class="checkbox-custom"></span>
          Ich verstehe, dass ich hiermit meinen Account unwiderruflich lösche.
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
            {{ submitting ? 'Löscht...' : 'Account Löschen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';

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
  padding: 20px;
  border-radius: 16px;
  background: var(--lbg);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-l);
}

.warning-box {
  background: rgba(246, 82, 82, 0.08);
  border: 1px solid rgba(246, 82, 82, 0.3);
  border-radius: 8px;
  padding: 16px;
}

.warning-box strong {
  color: var(--special--red);
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
}

.user-email {
  font-size: 13px;
  color: var(--sub);
  margin-bottom: 12px;
}

.warning-text {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.5;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  margin-top: 16px;
  padding: 8px 0;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border: 1px solid var(--border2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-top: 1px;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--special--red);
  border-color: var(--special--red);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  color: #fff;
  font-size: 12px;
}

.checkbox-label:hover .checkbox-custom {
  border-color: var(--sub);
}

.action-buttons {
  margin-top: 20px;
}

.message {
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 6px;
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

  .action-buttons {
    flex-direction: column-reverse;
  }

  .action-buttons .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>