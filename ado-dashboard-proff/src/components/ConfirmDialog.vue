<template>
  <div v-if="show" class="blurit" @click.stop="$emit('cancel')">
    <div class="confirm-box" @click.stop>
      <h4 style="margin-top: 0">Diesen Eintrag melden?</h4>
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
        <button
            class="btn danger"
            @click="$emit('confirm', category)"
            :disabled="category === 'falschinfo' && !reason?.trim()"
        >
          Eintrag melden
        </button>
        <button class="btn ghost" @click="$emit('cancel')">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import TabSwitcher from './TabSwitcher.vue'

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

.row {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
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

@media (max-width: 444px) {
  .confirm-box {
    padding: 20px 16px;
    width: 95%;
  }

  .row {
    flex-direction: column;
    gap: 8px;
  }

  .row button {
    width: 100%;
  }
}
</style>