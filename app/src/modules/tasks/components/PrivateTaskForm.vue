<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hw from '@/api/hwApi';
import type { PrivateTask } from '@/modules/tasks/types';
import BaseFormGroup from '@/common/components/BaseFormGroup.vue';

const props = defineProps<{
  initial?: PrivateTask;
  open: boolean;
}>();
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success', task: PrivateTask): void;
}>();

const title = ref(props.initial?.title || '');
const description = ref(props.initial?.description || '');

const submitting = ref(false);
const titleError = ref('');
const descriptionError = ref('');
const submitError = ref('');
const titleInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  titleInputRef.value?.focus();
});

async function submit() {
  titleError.value = '';
  descriptionError.value = '';
  submitError.value = '';

  if (!title.value.trim()) {
    titleError.value = 'A title is required.';
    return;
  }
  if (title.value.trim().length > 100) {
    titleError.value = 'Title is too long (max. 100 characters).';
    return;
  }
  if (description.value.trim().length > 2000) {
    descriptionError.value = 'Description is too long (max. 2000 characters).';
    return;
  }

  submitting.value = true;

  try {
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

    emit('success', responseData);
  } catch (e: unknown) {
    const err = e as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    submitError.value =
      err.response?.data?.error ??
      err.message ??
      'An unexpected error occurred.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :loading="submitting"
    :submit="submit"
  >
    <template #title>
      {{ initial ? 'Edit Private Entry' : 'New Private Entry' }}
    </template>

    <template #content>
      <BaseFormContent :error="submitError">
        <BaseFormGroup id="private-task-title-input" :error="titleError">
          <BaseLabel for="private-task-title-input" :required="true"
            >Title</BaseLabel
          >
          <BaseInput
            id="private-task-title-input"
            ref="titleInputRef"
            v-model="title"
            placeholder="Go shopping…"
            maxlength="100"
          />
        </BaseFormGroup>

        <BaseFormGroup
          id="private-task-description-input"
          :error="descriptionError"
        >
          <BaseLabel for="private-task-description-input" :required="false"
            >Description</BaseLabel
          >
          <BaseInput
            id="private-task-description-input"
            as="textarea"
            rows="4"
            v-model="description"
            placeholder="6 eggs…"
            maxlength="2000"
          />
        </BaseFormGroup>
      </BaseFormContent>
    </template>

    <template #action-text>
      {{ initial ? 'Save' : 'Create' }}
    </template>
  </BaseModal>
</template>
