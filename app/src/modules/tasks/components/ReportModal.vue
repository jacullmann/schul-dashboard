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
    <template #title> Diese Aufgabe melden? </template>

    <template #title-infopop>
      <InfoModal
        :tooltip="t('tasks.report.info_tooltip')"
        :title="t('tasks.report.info_title')"
      >
        <p class="text-on-ghost-muted text-base mb-4">
          Aufgaben und hochgeladene Bilder, die gegen unsere Nutzungsbedingungen
          oder geltendes Recht verstoßen, werden umgehend entfernt. Falls
          genaueres Wissen über den Hintergrund einer Aussage/eines Bildes nötig
          ist, beschreibe es bitte möglichst genau, sodass wir etwas unternehmen
          können. Wenn der Verstoß offensichtlich ist, kannst du uns trotzdem
          helfen, indem du beschreibst, was nicht stimmt, aber wir untersuchen
          immer den ganzen Artikel, auch wenn du keinen konkreten Grund nennst.
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

    <template #action-text>Aufgabe melden</template>
  </BaseModal>
</template>
