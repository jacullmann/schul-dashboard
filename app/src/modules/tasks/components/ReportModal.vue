<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseTabs from '@/common/components/BaseTabs.vue';
import InfoModal from '@/common/components/InfoModal.vue';

const { t } = useI18n();

const MAX_LENGTH = 5000;

const props = defineProps<{
  open: boolean;
  message: string;
  showReasonInput?: boolean;
  reason?: string;
  loading?: boolean;
}>();

const emit = defineEmits(['confirm', 'cancel', 'update:reason']);

const category = ref<'illegal' | 'falschinfo'>('illegal');

const tabItems = [
  { id: 'illegal', label: 'Unangebrachte/Illegale Inhalte' },
  { id: 'falschinfo', label: 'Falschinformation' },
];

const handleTabChange = (id: string) => {
  category.value = id as 'illegal' | 'falschinfo';
};

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      category.value = 'illegal';
    }
  },
);
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="emit('cancel')"
    :submit="() => emit('confirm', category)"
    :loading="loading"
    :danger="true"
    :requirement="!(category === 'falschinfo' && !reason?.trim())"
  >
    <template #title> Diesen Eintrag melden? </template>

    <template #title-infopop>
      <InfoModal
        :tooltip="t('tasks.report.info_tooltip')"
        :title="t('tasks.report.info_title')"
      >
        <h3 class="text-xl font-display font-bold mb-2">Falschinformationen</h3>
        <p class="text-on-ghost-muted text-base mb-4">
          Die Informationen, welche in dem Eintrag genannt werden, oder die
          hochgeladenen Bilder enthalten falsche oder irreführende Inhalte?
          Solchen Einträgen können Anmerkungen mit Korrekturen beigefügt werden,
          jedoch musst du beschreiben, was nicht stimmt und/oder wie die
          richtigen Informationen lauten. Versuche dich dabei bitte möglichst
          kurz und verständlich zu fassen. Deine Nachricht wird, sobald sie
          geprüft wurde, dem gemeldeten Eintrag angehängt.
        </p>
        <h3 class="text-xl font-display font-bold mb-2">
          Unangebrachte/Illegale Inhalte
        </h3>
        <p class="text-on-ghost-muted text-base mb-4">
          Einträge und hochgeladene Bilder, die gegen unsere Nutzungsbedingungen
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
      <BaseFormGroup id="reportReason">
        <BaseLabel for="reportReason">{{
          t('tasks.report.select_reason_label')
        }}</BaseLabel>
        <BaseTabs
          id="reportReason"
          :items="tabItems"
          :active-id="category"
          @change="handleTabChange"
        />
      </BaseFormGroup>

      <BaseFormGroup id="reportDescription">
        <BaseLabel for="reportDescription">
          {{
            category === 'falschinfo'
              ? t('tasks.report.reason_required_label')
              : 'Was genau ist das Problem? (optional)'
          }}
        </BaseLabel>
        <BaseInput
          as="textarea"
          id="reportDescription"
          class="w-full min-h-[120px] resize-vertical"
          :model-value="reason"
          @update:model-value="$emit('update:reason', $event)"
          :placeholder="
            category === 'falschinfo'
              ? t('tasks.report.reason_placeholder')
              : t('tasks.report.description_placeholder')
          "
          :required="category === 'falschinfo'"
          :maxlength="MAX_LENGTH"
        ></BaseInput>
      </BaseFormGroup>
    </template>

    <template #action-text>Eintrag melden</template>
  </BaseModal>
</template>
