<template>
  <Modal @cancel="$emit('cancel')">
    <template #title>
      {{ initial ? 'Privaten Eintrag bearbeiten' : 'Neuer privater Eintrag' }}
    </template>

    <template #content>
      <div class="section">
        <label class="label">Titel</label>
        <input ref="titleInputRef" class="input" v-model="title" placeholder="Einkaufen gehen..." maxlength="100" />
      </div>

      <div class="section">
        <label class="label">Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description" placeholder="6 Eier..." maxlength="2000"></textarea>
      </div>

      <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>
    </template>

    <template #action-btn>
      <button class="btn action" @click="submit" :disabled="submitting">
        <LoadingSpinner v-if="submitting" size="1.1em" />
        <span v-else>{{ initial ? 'Speichern' : 'Anlegen' }}</span>
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hw from '@/api/hwApi';
import Modal from '@/common/components/Modal.vue';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import type { Todo } from '@/modules/tasks/types.ts';

const props = defineProps<{ initial?: Todo }>();
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success', data: Todo): void;
  (e: 'error', msg: string): void
}>();

const title = ref(props.initial?.title || '');
const description = ref(props.initial?.description || '');

const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const titleInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  titleInputRef.value?.focus();
});

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