<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hw from '../../../api/api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success'): void;
}>();

const annContent = ref('');
const annColor = ref('warn');

const submitting = ref(false);
const contentError = ref('');
const submitError = ref('');

const contentInputRef = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
  contentInputRef.value?.focus();
});

async function submit() {
  contentError.value = '';
  submitError.value = '';

  if (!annContent.value.trim()) {
    contentError.value = t('announcements.form.errors.empty');
    return;
  }
  if (annContent.value.trim().length > 1000) {
    contentError.value = t('announcements.form.errors.too_long');
    return;
  }

  submitting.value = true;
  try {
    await hw.post('/group-admin/announcements', {
      content: annContent.value.trim(),
      color: annColor.value,
    });
    emit('success');
  } catch (e: unknown) {
    const err = e as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    submitError.value =
      err.response?.data?.error ??
      err.message ??
      t('common.errors.unknown');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :submit="submit"
    :loading="submitting"
  >
    <template #title>{{ t('announcements.form.title') }}</template>

    <template #content>
      <BaseFormContent :error="submitError">
        <BaseFormGroup id="announcement-content-input" :error="contentError">
          <BaseLabel for="announcement-content-input" :required="true"
            >Ankündigung</BaseLabel
          >
          <BaseInput
            id="announcement-content-input"
            as="textarea"
            ref="contentInputRef"
            v-model="annContent"
            placeholder="Verfasse deine Nachricht..."
            rows="3"
            maxlength="1000"
            :aria-describedby="
              contentError ? 'announcement-content-input-error' : undefined
            "
          />
        </BaseFormGroup>

        <BaseFormGroup id="announcement-importance-input">
          <BaseLabel for="announcement-importance-input" :required="true"
            >Wichtigkeit</BaseLabel
          >
          <BaseSelect
            id="announcement-importance-input"
            v-model="annColor"
            :options="[
              { label: t('announcements.form.options.info'), value: 'info' },
              { label: t('announcements.form.options.warning'), value: 'warn' },
              { label: t('announcements.form.options.important'), value: 'danger' },
            ]"
          />
        </BaseFormGroup>
      </BaseFormContent>
    </template>

    <template #action-text>
      {{ t('common.buttons.add') }}
    </template>
  </BaseModal>
</template>
