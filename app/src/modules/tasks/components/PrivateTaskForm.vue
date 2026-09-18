<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '../../../api/api';
import type { PrivateTask } from '@/modules/tasks/types';
import BaseFormGroup from '@/common/components/BaseFormGroup.vue';
import { apiErrorMessage } from '@/api/errors';

const props = defineProps<{
  initial?: PrivateTask;
  open: boolean;
}>();
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success', task: PrivateTask): void;
}>();

const { t, tm, rt } = useI18n();

type PlaceholderMessage = { title: string; description: string };

// Pick one title/description pair per form instance so both fields match.
const placeholders = computed(
  () => tm('tasks.private_tasks.form_placeholders') as PlaceholderMessage[],
);
const placeholderIndex = Math.floor(Math.random() * placeholders.value.length);
const placeholder = computed(() => {
  const entry = placeholders.value[placeholderIndex];
  return entry
    ? { title: rt(entry.title), description: rt(entry.description) }
    : { title: '', description: '' };
});

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
    titleError.value = t('tasks.private_tasks.form.errors.title_missing');
    return;
  }
  if (title.value.trim().length > 100) {
    titleError.value = t('tasks.private_tasks.form.errors.title_long');
    return;
  }
  if (description.value.trim().length > 2000) {
    descriptionError.value = t(
      'tasks.private_tasks.form.errors.description_long',
    );
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
      const { data } = await hw.put(`/todos/${props.initial.id}`, payload);
      responseData = data;
    } else {
      const { data } = await hw.post('/todos', payload);
      responseData = data;
    }

    emit('success', responseData);
  } catch (e: unknown) {
    const err = e as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    submitError.value = apiErrorMessage(
      err,
      err.message ?? t('tasks.private_tasks.form.errors.unexpected'),
    );
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :loading="submitting"
    :submit="submit"
    @cancel="$emit('cancel')"
  >
    <template #title>
      {{
        initial
          ? t('tasks.private_tasks.form.edit_title')
          : t('tasks.private_tasks.form.new_title')
      }}
    </template>

    <template #content>
      <BaseFormContent :error="submitError">
        <BaseFormGroup id="private-task-title-input" :error="titleError">
          <BaseLabel for="private-task-title-input" :required="true">{{
            t('tasks.list.task_form.title')
          }}</BaseLabel>
          <BaseInput
            id="private-task-title-input"
            ref="titleInputRef"
            v-model="title"
            :placeholder="placeholder.title"
            maxlength="100"
          />
        </BaseFormGroup>

        <BaseFormGroup
          id="private-task-description-input"
          :error="descriptionError"
        >
          <BaseLabel for="private-task-description-input" :required="false">{{
            t('tasks.list.task_form.description')
          }}</BaseLabel>
          <BaseInput
            id="private-task-description-input"
            v-model="description"
            as="textarea"
            rows="4"
            :placeholder="placeholder.description"
            maxlength="2000"
          />
        </BaseFormGroup>
      </BaseFormContent>
    </template>

    <template #action-text>
      {{ initial ? t('common.buttons.save') : t('common.buttons.create') }}
    </template>
  </BaseModal>
</template>
