<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import BaseTabs from '@/common/components/BaseTabs.vue';
import InfoModal from '@/common/components/InfoModal.vue';

const MAX_LENGTH = 5000;

const reasonLength = computed(() => {
  return props.reason?.length || 0
})
// Überprüfen: Wird loading wirklich korrekt übergeben? auch in anderen dateien prüfen.
const props = defineProps<{
  show: boolean
  message: string
  showReasonInput?: boolean
  reason?: string
  loading?: boolean
}>()

const emit = defineEmits(['confirm', 'cancel', 'update:reason'])

const category = ref<'illegal' | 'falschinfo'>('illegal')

// TabSwitcher Items
const tabItems = [
  { id: 'illegal', label: 'Unangebrachte/Illegale Inhalte' },
  { id: 'falschinfo', label: 'Falschinformation' }
]

const handleTabChange = (id: string) => {
  category.value = id as 'illegal' | 'falschinfo'
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    category.value = 'illegal'
  }
})
</script>

<template>
  <BaseModal v-if="show" @cancel="emit('cancel')" :submit="emit('confirm', category)" :loading="loading" :danger="true" :requirement="!(category === 'falschinfo' && !reason?.trim())">
    <template #title>
      Diesen Eintrag melden?
    </template>

    <template #title-infopop>
      <InfoModal tooltip="Melden Info" title="Infos zum Melden von Einträgen">
        <h3>Falschinformationen</h3>
        <p>Die Informationen, welche in dem Eintrag genannt werden, oder die hochgeladenen Bilder enthalten falsche oder irreführende Inhalte? Solchen Einträgen können Anmerkungen mit Korrekturen beigefügt werden, jedoch musst du beschreiben, was nicht stimmt und/oder wie die richtigen Informationen lauten. Versuche dich dabei bitte möglichst kurz und verständlich zu fassen. Deine Nachricht wird, sobald sie geprüft wurde, dem gemeldeten Eintrag angehängt.</p>
        <h3>Unangebrachte/Illegale Inhalte</h3>
        <p>Einträge und hochgeladene Bilder, die gegen unsere Nutzungsbedingungen oder geltendes Recht verstoßen, werden umgehend entfernt. Falls genaueres Wissen über den Hintergrund einer Aussage/eines Bildes nötig ist, beschreibe es bitte möglichst genau, sodass wir etwas unternehmen können. Wenn der Verstoß offensichtlich ist, kannst du uns trotzdem helfen, indem du beschreibst, was nicht stimmt, aber wir untersuchen immer den ganzen Artikel, auch wenn du keinen konkreten Grund nennst.</p>
      </InfoModal>
    </template>

    <template #content>
      <p class="m-0">Wähle den Grund aus:</p>

      <!-- TabSwitcher Navigation -->
      <div class="tab-navigation">
        <BaseTabs
            :items="tabItems"
            :active-id="category"
            @change="handleTabChange"
        />
      </div>

      <div class="reason-input">
        <BaseLabel for="reportReason">
          {{ category === 'falschinfo' ? 'Begründung (erforderlich)' : 'Was genau ist das Problem? (optional)' }}
        </BaseLabel>
        <BaseInput
            as="textarea"
            id="reportReason"
            class="min-h-[120px] resize-vertical"
            :model-value="reason"
            @update:model-value="$emit('update:reason', $event)"
            :placeholder="category === 'falschinfo' ? 'Begründung...' : 'Beschreibung...'"
            :required="category === 'falschinfo'"
            :maxlength="MAX_LENGTH"  ></BaseInput>
        <div class="counter">
          <p class="count-small">{{ reasonLength }} / {{ MAX_LENGTH }}</p>
        </div>
      </div>
    </template>

    <template #action-text>
      Eintrag melden
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-box {
  background: var(--color-canvas);
  padding: 16px;
  border-radius: 16px;
  max-width: 480px;
  width: 90%;
  text-align: left;
  border: 1px solid var(--color-canvas-border);
  box-shadow: var(--shadow-menu);
}

.tab-navigation {
  width: 100%;
  margin: 0;
}

.confirm-box p {
  text-align: left;
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-on-surface);
}

.reason-input {
  margin-bottom: 24px;
  position: relative;
}

.reason-input label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-on-surface);
}

.btn.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.danger:disabled:hover {
  background: var(--color-danger);
}

.counter {
  position: absolute;
  bottom: -5px;
  right: 12px;
  z-index: 1;
  pointer-events: none;
}

.count-small {
  font-size: var(--text-footnote);
  color: var(--color-on-surface-muted);
  opacity: 0.8;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0;
}
</style>