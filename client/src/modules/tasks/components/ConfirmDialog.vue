<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import TabSwitcher from '@/common/components/TabSwitcher.vue';
import InfoModalCenter from '@/common/components/InfoModalCenter.vue';
import Modal from '@/common/components/Modal.vue';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';

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
  <Modal v-if="show" @cancel="emit('cancel')">
    <template #title>
      <h4 style="margin: 0">Diesen Eintrag melden?</h4>
    </template>

    <template #title-infopop>
      <InfoModalCenter tooltip="Melden Info" title="Infos zum Melden von Einträgen">
        <h3>Falschinformationen</h3>
        <p>Die Informationen, welche in dem Eintrag genannt werden, oder die hochgeladenen Bilder enthalten falsche oder irreführende Inhalte? Solchen Einträgen können Anmerkungen mit Korrekturen beigefügt werden, jedoch musst du beschreiben, was nicht stimmt und/oder wie die richtigen Informationen lauten. Versuche dich dabei bitte möglichst kurz und verständlich zu fassen. Deine Nachricht wird, sobald sie geprüft wurde, dem gemeldeten Eintrag angehängt.</p>
        <h3>Unangebrachte/Illegale Inhalte</h3>
        <p>Einträge und hochgeladene Bilder, die gegen unsere Nutzungsbedingungen oder geltendes Recht verstoßen, werden umgehend entfernt. Falls genaueres Wissen über den Hintergrund einer Aussage/eines Bildes nötig ist, beschreibe es bitte möglichst genau, sodass wir etwas unternehmen können. Wenn der Verstoß offensichtlich ist, kannst du uns trotzdem helfen, indem du beschreibst, was nicht stimmt, aber wir untersuchen immer den ganzen Artikel, auch wenn du keinen konkreten Grund nennst.</p>
      </InfoModalCenter>
    </template>

    <template #content>
      <p style="margin: 0">Wähle den Grund aus:</p>

      <!-- TabSwitcher Navigation -->
      <div class="tab-navigation">
        <TabSwitcher
            :items="tabItems"
            :active-id="category"
            @change="handleTabChange"
        />
      </div>

      <div class="reason-input">
        <label for="reportReason">
          {{ category === 'falschinfo' ? 'Begründung (erforderlich)' : 'Was genau ist das Problem? (optional)' }}
        </label>
        <textarea
            id="reportReason"
            :value="reason"
            @input="$emit('update:reason', ($event.target as HTMLTextAreaElement).value)"
            :placeholder="category === 'falschinfo' ? 'Begründung...' : 'Beschreibung...'"
            :required="category === 'falschinfo'"
            :maxlength="MAX_LENGTH"  ></textarea>
        <div class="counter">
          <p class="count-small">{{ reasonLength }} / {{ MAX_LENGTH }}</p>
        </div>
      </div>
    </template>

    <template #action-btn>
      <button
          class="btn danger"
          @click="$emit('confirm', category)"
          :disabled="loading || (category === 'falschinfo' && !reason?.trim())"
      >
        <LoadingSpinner v-if="loading" size="1.1em" />
        <span v-else>Eintrag melden</span>
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.confirm-box {
  background: var(--lbg);
  padding: 16px;
  border-radius: 16px;
  max-width: 480px;
  width: 90%;
  text-align: left;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-l);
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
  color: var(--text);
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
  color: var(--text);
}

.reason-input textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: var(--vlbg);
  color: var(--text);
  border: 1px solid var(--border2);
  outline: none;
  min-height: 120px;
  resize: vertical;
  font-family: var(--normal-font), sans-serif;
  box-sizing: border-box;
}

.btn.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.danger:disabled:hover {
  background: var(--danger);
}

.counter {
  position: absolute;
  bottom: -5px;
  right: 12px;
  z-index: 1;
  pointer-events: none;
}

.count-small {
  font-size: var(--font-size-footnote);
  color: var(--sub);
  opacity: 0.8;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0;
}
</style>