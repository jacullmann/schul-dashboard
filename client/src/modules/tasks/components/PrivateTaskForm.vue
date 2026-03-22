<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hw from '@/api/hwApi';
import Modal from '@/common/components/Modal.vue';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import type { PrivateTask } from '@/modules/tasks/types';

const props = defineProps<{ initial?: PrivateTask }>();
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success', data: PrivateTask): void;
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
    if (!title.value.trim()) throw new Error('A title is required.');
    if (title.value.trim().length > 100) throw new Error('Title is too long (max. 100 characters).');
    if (description.value.trim().length > 2000) throw new Error('Description is too long (max. 2000 characters).');

    const payload = {
      title: title.value.trim(),
      description: description.value.trim(),
    };

    let responseData: PrivateTask;
    if (props.initial) {
      const { data } = await hw.put(`/api/todos/${props.initial.id}`, payload);
      responseData = data;
    } else {
      const { data } = await hw.post('/api/todos', payload);
      responseData = data;
    }

    isError.value = false;
    // Delegate success notification to the parent — avoids duplicate toasts.
    emit('success', responseData);

  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }, message?: string };
    message.value = err.response?.data?.error || err.message || 'An error occurred.';
    isError.value = true;
    emit('error', message.value);
  } finally {
    submitting.value = false;
  }
}

</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <Modal @cancel="$emit('cancel')">
      <template #title>
        {{ initial ? 'Edit Private Entry' : 'New Private Entry' }}
      </template>

      <template #content>
        <div class="section">
          <label class="label">Title</label>
          <input ref="titleInputRef" class="input" v-model="title" placeholder="Go shopping…" maxlength="100" />
        </div>

        <div class="section">
          <label class="label">Description (optional)</label>
          <textarea class="input" rows="4" v-model="description" placeholder="6 eggs…" maxlength="2000"></textarea>
        </div>

        <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>
      </template>

      <template #action-btn>
        <button type="submit" class="btn action" :disabled="submitting">
          <LoadingSpinner v-if="submitting" size="1.1em" />
          <span v-else>{{ initial ? 'Save' : 'Create' }}</span>
        </button>
      </template>
    </Modal>
  </form>
</template>

<style scoped>
.section {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: var(--font-size-sub);
  color: var(--text-default);
  margin-bottom: 6px;
}

.small {
  font-size: var(--font-size-sub);
  margin-left: auto;
}

.msg-error {
  color: var(--danger);
}
</style>
