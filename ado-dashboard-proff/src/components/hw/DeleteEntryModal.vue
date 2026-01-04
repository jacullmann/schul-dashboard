<template>
  <div v-if="show" class="blurit" @click.stop="$emit('cancel')">
    <div class="delete-box" @click.stop>
      <h4 style="margin-top: 0">Diesen Eintrag löschen?</h4>
      <p>Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen Bilder unwiderruflich gelöscht.</p>

      <div class="row">
        <button
            class="btn ghost"
            @click="$emit('cancel')"
            data-umami-event="Eintrag löschen abbrechen"
        >
          Abbrechen
        </button>
        <button
            class="btn danger"
            @click="$emit('confirm')"
            data-umami-event="Eintrag endgültig löschen bestätigen"
        >
          Eintrag löschen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
}>()

defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.delete-box {
  background: var(--lbg);
  padding: 16px;
  border-radius: 16px;
  max-width: 420px;
  width: 90%;
  text-align: left;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-l);
}

.delete-box h4 {
  color: var(--text);
  margin-bottom: 12px;
}

.delete-box p {
  text-align: left;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}

.row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>