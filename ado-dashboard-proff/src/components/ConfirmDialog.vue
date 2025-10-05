<template>
  <div v-if="show" class="confirm-backdrop">
    <div class="confirm-box">
      <p>{{ message }}</p>
      <div class="actions">
        <button class="btn danger" @click="$emit('confirm')">Ja</button>
        <button class="btn ghost" @click="$emit('cancel')">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  message: string
}>()

defineEmits(['confirm', 'cancel'])
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
  padding: 20px;
  border-radius: 8px;
  max-width: 320px;
  width: 90%;
  text-align: center;
}
.actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
