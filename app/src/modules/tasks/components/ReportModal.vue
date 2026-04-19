<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import BaseTabs from '@/common/components/BaseTabs.vue';
import InfoModal from '@/common/components/InfoModal.vue';

const MAX_LENGTH = 5000;

const reasonLength = computed(() => {
  return props.reason?.length || 0;
});

const props = defineProps<{
  show: boolean;
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
  () => props.show,
  (newVal) => {
    if (newVal) {
      category.value = 'illegal';
    }
  },
);
</script>

<template>
  <BaseModal
    v-if="show"
    @cancel="emit('cancel')"
    :submit="() => emit('confirm', category)"
    :loading="loading"
    :danger="true"
    :requirement="!(category === 'falschinfo' && !reason?.trim())"
  >
    <template #title> Diesen Eintrag melden? </template>

    <template #title-infopop>
      <InfoModal tooltip="Melden Info" title="Infos zum Melden von Einträgen">
        <h3 class="text-h3 font-display font-bold mb-2">Falschinformationen</h3>
        <p class="text-on-surface-muted text-body mb-4">
          Die Informationen, welche in dem Eintrag genannt werden, oder die
          hochgeladenen Bilder enthalten falsche oder irreführende Inhalte?
          Solchen Einträgen können Anmerkungen mit Korrekturen beigefügt werden,
          jedoch musst du beschreiben, was nicht stimmt und/oder wie die
          richtigen Informationen lauten. Versuche dich dabei bitte möglichst
          kurz und verständlich zu fassen. Deine Nachricht wird, sobald sie
          geprüft wurde, dem gemeldeten Eintrag angehängt.
        </p>
        <h3 class="text-h3 font-display font-bold mb-2">Unangebrachte/Illegale Inhalte</h3>
        <p class="text-on-surface-muted text-body mb-4">
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
      <p class="text-on-surface font-semibold text-sm mb-4">Wähle den Grund aus:</p>

      <div class="w-full mb-0">
        <BaseTabs
          :items="tabItems"
          :active-id="category"
          @change="handleTabChange"
        />
      </div>

      <div class="mb-6 relative">
        <BaseLabel for="reportReason" class="block text-sm font-medium mb-2 text-on-surface">
          {{
            category === 'falschinfo'
              ? 'Begründung (erforderlich)'
              : 'Was genau ist das Problem? (optional)'
          }}
        </BaseLabel>
        <BaseInput
          as="textarea"
          id="reportReason"
          class="w-full min-h-[120px] resize-vertical"
          :model-value="reason"
          @update:model-value="$emit('update:reason', $event)"
          :placeholder="
            category === 'falschinfo' ? 'Begründung...' : 'Beschreibung...'
          "
          :required="category === 'falschinfo'"
          :maxlength="MAX_LENGTH"
        ></BaseInput>
        <div class="absolute bottom-[-5px] right-3 z-1 pointer-events-none">
          <p class="text-footnote text-on-surface-muted opacity-80 px-2 py-0.5 rounded m-0">
            {{ reasonLength }} / {{ MAX_LENGTH }}
          </p>
        </div>
      </div>
    </template>

    <template #action-text> Eintrag melden </template>
  </BaseModal>
</template>

