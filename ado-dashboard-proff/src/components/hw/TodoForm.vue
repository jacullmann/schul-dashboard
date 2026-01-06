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
        <input class="input" v-model="title" placeholder="z.B. Mathe-Übungen machen" maxlength="100" />
      </div>

      <div class="section">
        <label class="label">Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description" placeholder="Details zu diesem privaten Eintrag..." maxlength="2000"></textarea>
      </div>

      <div class="row actions">
        <button class="btn action" @click="submit" :disabled="submitting">
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
  description: string;
}

const props = defineProps<{ initial?: TodoItem }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', data: TodoItem): void;
  (e: 'error', msg: string): void
}>();

const title = ref(props.initial?.title || '');
const description = ref(props.initial?.description || '');

const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;

  try {
    if (containsProfanity(title.value) || containsProfanity(description.value)) {
      throw new Error('Unangemessene Inhalte erkannt.');
    }

    if (!title.value.trim()) throw new Error('Titel fehlt.');
    if (title.value.trim().length > 100) throw new Error('Titel zu lang (max 100).');
    if (description.value.trim().length > 1000) throw new Error('Beschreibung zu lang (max 1000).');

    const payload = {
      title: title.value.trim(),
      description: description.value.trim(),
    };

    let responseData;
    if (props.initial) {
      const { data } = await hw.put(`/api/todos/${props.initial.id}`, payload);
      responseData = data;
      message.value = 'Aktualisiert.';
    } else {
      const { data } = await hw.post('/api/todos', payload);
      responseData = data;
      message.value = 'Erstellt.';
    }

    isError.value = false;
    emit('success', responseData);

  } catch (e: any) {
    message.value = e.response?.data?.error || e.message || 'Fehler.';
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
  max-width: 500px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--lbg);
  box-shadow: var(--shadow-l);
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
  position: fixed;
  z-index: 100001;
}

.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-title { margin: 0; font-size: 20px; font-weight: 600; color: var(--text); }
.section { margin-top: 16px; }
.label { display: block; font-size: 14px; color: var(--text); margin-bottom: 8px; }
.actions {
  margin-top: 24px;
}
.spinner { animation: spin 1s linear infinite; height: 20px; width: 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
.small { font-size: 13px; margin-left: auto; }
.msg-ok { color: var(--primary); }
.msg-error {
  color: var(--danger);
}
</style>