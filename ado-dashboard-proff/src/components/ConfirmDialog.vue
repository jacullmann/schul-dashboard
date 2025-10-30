<template>
  <div v-if="show" class="confirm-backdrop" @click.stop="$emit('cancel')">
    <div class="confirm-box" @click.stop>
      <div style="text-align: left; justify-content: left; align-items: flex-start">
        <p>{{ message }}</p>
      </div>


      <div v-if="showReasonInput" class="reason-input">
        <label for="reportReason">Was genau ist das Problem? (optional)</label>
        <textarea
            id="reportReason"
            :value="reason"
            @input="$emit('update:reason', ($event.target as HTMLTextAreaElement).value)"
            placeholder="Beschreibung..."
        ></textarea>
      </div>

      <div class="actions">
        <button class="btn danger" @click="$emit('confirm')">Eintrag melden</button>
        <button class="btn ghost" @click="$emit('cancel')">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  message: string
  // NEU: Props für das Textfeld
  showReasonInput?: boolean
  reason?: string
}>()

// NEU: 'update:reason' emit
defineEmits(['confirm', 'cancel', 'update:reason'])
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
  background: var(--card);
  padding: 15px;
  border-radius: 8px;
  max-width: 400px; /* Etwas breiter für das Textfeld */
  width: 90%;
  text-align: left; /* Besser für Label + Textarea */
}
.confirm-box p {
  text-align: left;
  margin-bottom: 16px;
  font-weight: 600;
}

/* NEU: Styles für das Textfeld */
.reason-input {
  margin-bottom: 16px;
}
.reason-input label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}
.reason-input textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--jj); /* Passend zum App-Hintergrund */
  color: var(--text);
  font-size: 14px;
  resize: vertical;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: left;
}
</style>