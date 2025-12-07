<template>
  <div class="blurit" @click.self="$emit('close')" aria-hidden="true">
    <div class="glass-modal" role="dialog" aria-modal="true" aria-label="Privaten Eintrag hinzufügen">
      <div class="modal-header">
        <h3 class="modal-title">
          {{ initial ? 'Privaten Eintrag bearbeiten' : 'Neuer privater Eintrag' }}
        </h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div class="section">
        <label class="label">Titel</label>
        <input class="input" v-model="title" placeholder="z.B. Mathe-Übungen machen" />
      </div>

      <div class="section">
        <label class="label">Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="content" placeholder="Details zu diesem Eintrag..."></textarea>
      </div>

      <div class="section">
        <label class="label">Fälligkeitsdatum (optional)</label>
        <input class="input" type="date" v-model="dueLocal" />
      </div>

      <div class="row actions">
        <button class="btn ghost" @click="submit" :disabled="submitting">
          <svg v-if="submitting" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ initial ? 'Speichern' : 'Anlegen' }}
        </button>
        <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';
import { containsProfanity } from '../../composables/useProfanity';

interface TodoItem {
  id: string;
  title: string;
  content: string;
  dueDate: string | null;
}

const props = defineProps<{ initial?: TodoItem }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void; (e: 'error', msg: string): void }>();

const title = ref(props.initial?.title || '');
const content = ref(props.initial?.content || '');
const dueLocal = ref(props.initial?.dueDate ? new Date(props.initial.dueDate).toISOString().slice(0, 10) : '');

const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;

  try {
    if (containsProfanity(title.value) || containsProfanity(content.value)) {
      throw new Error('Unangemessene Inhalte erkannt. Bitte drücke dich in angemessener Sprache aus.');
    }

    if (!title.value.trim()) {
      throw new Error('Du musst einen Titel hinzufügen');
    }
    if (title.value.trim().length < 1 || title.value.trim().length > 100) {
      throw new Error('Der Titel muss zwischen 1 und 100 Zeichen lang sein');
    }
    if (content.value.trim().length > 5000) {
      throw new Error('Die Beschreibung ist zu lang (max. 5000 Zeichen)');
    }

    const payload: any = {
      title: title.value.trim(),
      content: content.value.trim(),
    };

    if (dueLocal.value) {
      const selected = new Date(dueLocal.value);
      selected.setHours(23, 59, 0, 0);
      payload.dueDate = selected.toISOString();
    }

    if (props.initial) {
      await hw.put(`/api/todos/${props.initial.id}`, payload);
      message.value = 'Eintrag erfolgreich aktualisiert.';
    } else {
      await hw.post('/api/todos', payload);
      message.value = 'Eintrag erfolgreich angelegt.';
    }

    isError.value = false;
    emit('success');

  } catch (e: any) {
    if (e.response?.status === 400) {
      message.value = e.response.data.error || 'Bitte überprüfe deine Eingaben.';
    } else if (e.message) {
      message.value = e.message;
    } else {
      message.value = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
    isError.value = true;
    emit('error', message.value);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.glass-modal {
  width: 100%;
  max-width: 720px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--lbg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  padding: 16px;
  color: #1a1a1a;
  max-height: calc(100vh - 40px);
  overflow-y: scroll;
  position: fixed;
  z-index: 100001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(244, 244, 244);
}

.section {
  margin-top: 10px;
}

.label {
  display: block;
  font-size: 13px;
  color: rgba(244, 244, 244);
  margin-bottom: 6px;
}

.actions {
  margin-top: 16px;
  align-items: center;
}

.spinner {
  animation: spin 1s linear infinite;
  height: 20px;
  width: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.small {
  font-size: 12px;
  color: var(--muted);
}

.msg-ok {
  color: var(--primary);
}

.msg-error {
  color: var(--danger);
}
</style>