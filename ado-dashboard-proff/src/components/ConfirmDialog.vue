<template>
  <div v-if="show" class="confirm-backdrop" @click.stop="$emit('cancel')">
    <div class="confirm-box" @click.stop>
      <h4 style="margin-top: 0">Diesen Eintrag melden?</h4>
      <p>Wähle den Grund aus:</p>
      <div class="category-tabs">
        <button
            class="btn"
            :class="{ ghost: category !== 'illegal' }"
            @click="category = 'illegal'"
        >
          Unangebrachte/Illegale Inhalte
        </button>
        <button
            class="btn"
            :class="{ ghost: category !== 'falschinfo' }"
            @click="category = 'falschinfo'"
        >
          Falschinformation
        </button>
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

watch(() => props.show, (newVal) => {
  if (newVal) {
    category.value = 'illegal'
  }
})
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-box {
  background: var(--lbg);
  padding: 16px;
  border-radius: 16px;
  max-width: 420px;
  width: 90%;
  text-align: left;
  border: 1px solid var(--border);

}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  flex-direction: row;
}

.confirm-box p {
  text-align: left;
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
}

.reason-input {
  margin-bottom: 16px;
  position: relative;
}

.reason-input label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text);
}

.row {
  display: flex;
  gap: 8px;
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
textarea {
  min-height: 100px;
  padding-bottom: 20px;
}
@media (max-width: 500px) {
  .category-tabs{
    flex-direction: column;
  }
}
</style>