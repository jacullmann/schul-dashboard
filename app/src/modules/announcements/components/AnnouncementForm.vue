<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
    contentError.value = 'Eine Ankündigung darf nicht leer sein.';
    return;
  }
  if (annContent.value.trim().length > 1000) {
    contentError.value = 'Die Ankündigung ist zu lang (max. 1000 Zeichen).';
    return;
  }

  submitting.value = true;
  try {
    await hw.post('/api/group-admin/announcements', {
      content: annContent.value.trim(),
      color: annColor.value,
    });
    emit('success');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string };
    submitError.value =
      err.response?.data?.error ?? err.message ?? 'Ein unerwarteter Fehler ist aufgetreten.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <BaseModal @cancel="$emit('cancel')">
      <template #title>
        Neue Ankündigung
      </template>

      <template #content>
        <BaseFormContent :error="submitError">
          <BaseFormGroup id="announcement-content-input" :error="contentError">
            <BaseLabel for="announcement-content-input" :required="true">Ankündigung</BaseLabel>
            <BaseInput
              id="announcement-content-input"
              as="textarea"
              ref="contentInputRef"
              v-model="annContent"
              placeholder="Verfasse deine Nachricht..."
              rows="3"
              maxlength="1000"
              :aria-describedby="contentError ? 'announcement-content-input-error' : undefined"
            />
          </BaseFormGroup>

          <BaseFormGroup id="announcement-importance-input">
            <BaseLabel for="announcement-importance-input" :required="true">Wichtigkeit</BaseLabel>
            <BaseSelect
              id="announcement-importance-input"
              v-model="annColor"
              :options="[
                { label: 'Info', value: 'info' },
                { label: 'Warnung', value: 'warn' },
                { label: 'Wichtig', value: 'danger' },
              ]"
            />
          </BaseFormGroup>
        </BaseFormContent>
      </template>

      <template #action-btn>
        <BaseButton @click="submit" variant="action" :loading="submitting">
          {{ t('global.buttons.add') }}
        </BaseButton>
      </template>
    </BaseModal>
  </form>
</template>
