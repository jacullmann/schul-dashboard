<template>
  <div v-if="show" class="blurit" @click.stop="$emit('cancel')">
    <div class="confirm-box" @click.stop>
      <div class="report">
        <h4 style="margin-top: 0">Diesen Eintrag melden?</h4>
        <InfoModalCenter tooltip="Melden Info" title="Infos zum Melden von Einträgen">
          <h3>Falschinformationen</h3>
          Die Informationen, welche in dem Eintrag genannt werden, oder die hochgeladenen Bilder enthalten falsche oder irreführende Inhalte? Solchen Einträgen können Anmerkungen mit Korrekturen beigefügt werden, jedoch musst du beschreiben, was nicht stimmt und/oder wie die richtigen Informationen lauten. Versuche dich dabei bitte möglichst kurz und verständlich zu fassen. Deine Nachricht wird, sobald sie geprüft wurde, dem gemeldeten Eintrag angehängt.
          <h3>Unangebrachte/Illegale Inhalte</h3>
          Einträge und hochgeladene Bilder, die gegen unsere Nutzungsbedingungen oder geltendes Recht verstoßen, werden umgehend entfernt. Falls genaueres Wissen über den Hintergrund einer Aussage/eines Bildes nötig ist, beschreibe es bitte möglichst genau, sodass wir etwas unternehmen können. Wenn der Verstoß offensichtlich ist, kannst du uns trotzdem helfen, indem du beschreibst, was nicht stimmt, aber wir untersuchen immer den ganzen Artikel, auch wenn du keinen konkreten Grund nennst.
        </InfoModalCenter>
      </div>
      <p>Wähle den Grund aus:</p>

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

      <div class="row">
        <button class="btn ghost" @click="$emit('cancel')">Abbrechen</button>
        <button
            class="btn danger"
            @click="$emit('confirm', category)"
            :disabled="category === 'falschinfo' && !reason?.trim()"
        >
          Eintrag melden
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import TabSwitcher from './TabSwitcher.vue'
import InfoModalCenter from "./info/InfoModalCenter.vue";

const MAX_LENGTH = 5000;

const reasonLength = computed(() => {
  return props.reason?.length || 0
})

const props = defineProps<{
  show: boolean
  message: string
  showReasonInput?: boolean
  reason?: string
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

<style scoped>
.blurit {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.4);
  border-radius: 0;
  border: none;
}

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
  margin-bottom: 20px;
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
  font-size: 12px;
  color: var(--sub);
  opacity: 0.8;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0;
}
.report {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-block: 0 1rem;
    color: var(--text);
}
</style>