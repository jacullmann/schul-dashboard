<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import InfoModal from '@/common/components/InfoModal.vue';

const { t } = useI18n();

const MAX_LENGTH = 5000;

defineProps<{
  open: boolean;
  message: string;
  showReasonInput?: boolean;
  reason?: string;
  loading?: boolean;
}>();

const emit = defineEmits(['confirm', 'cancel', 'update:reason']);
</script>

<template>
  <BaseModal
    :open="open"
    :submit="() => emit('confirm')"
    :loading="loading"
    :danger="true"
    @cancel="emit('cancel')"
  >
    <template #title>
      {{ t('tasks.list.tasks.menu.report.title') }}
    </template>

    <template #title-infopop>
      <InfoModal
        :tooltip="t('tasks.report.info_tooltip')"
        :title="t('tasks.report.info_title')"
      >
        <p class="text-on-ghost-muted text-base mb-4">
          {{ t('tasks.report.info_text') }}
        </p>
      </InfoModal>
    </template>

    <template #content>
      <BaseFormGroup id="reportDescription">
        <BaseLabel for="reportDescription">
          {{ t('tasks.list.tasks.menu.report.illegal_label') }}
        </BaseLabel>
        <BaseInput
          id="reportDescription"
          as="textarea"
          class="w-full min-h-[120px] resize-vertical"
          :model-value="reason"
          :placeholder="t('tasks.list.tasks.menu.report.illegal_placeholder')"
          :maxlength="MAX_LENGTH"
          @update:model-value="$emit('update:reason', $event)"
        ></BaseInput>
      </BaseFormGroup>
    </template>

    <template #action-text>{{
      t('tasks.list.tasks.menu.report.action')
    }}</template>
  </BaseModal>
</template>
