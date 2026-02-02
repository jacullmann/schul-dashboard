<template>
  <Modal @cancel="$emit('cancel')">
    <template #title>
      {{ initial ? 'Privaten Eintrag bearbeiten' : 'Neuer privater Eintrag' }}
    </template>

    <template #content>
      <div class="section">
        <label class="label">Titel</label>
        <input class="input" v-model="title" placeholder="Einkaufen gehen..." maxlength="100" />
      </div>

      <div class="section">
        <label class="label">Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description" placeholder="6 Eier..." maxlength="2000"></textarea>
      </div>

      <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>
    </template>

    <template #action-btn>
      <button class="btn action" @click="submit" :disabled="submitting">
        <svg v-if="submitting" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ initial ? 'Speichern' : 'Anlegen' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';
import Modal from './Modal.vue';

interface TodoItem {
  id: string;
  title: string;
  description: string;
}

const props = defineProps<{ initial?: TodoItem }>();
const emit = defineEmits<{
  (e: 'cancel'): void;
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
    if (!title.value.trim()) throw new Error('Du musst einen Titel hinzufügen.');
    if (title.value.trim().length > 100) throw new Error('Der Titel ist zu lang (max. 100 Zeichen).');
    if (description.value.trim().length > 2000) throw new Error('Die Beschreibung ist zu lang (max. 2000 Zeichen).');

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
.section {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: var(--font-size-sub);
  color: var(--text);
  margin-bottom: 6px;
}

.spinner {
  animation: spin 1s linear infinite;
  height: 20px;
  width: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.small {
  font-size: var(--font-size-sub);
  margin-left: auto;
}

.msg-ok {
  color: var(--primary);
}

.msg-error {
  color: var(--danger);
}
</style>