<template>
  <div class="blurit" @click.self="$emit('close')" aria-hidden="true">
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="">
      <div class="modal-header">
        <div class="modal-title">
          <h3 class="modal-title-text">
            <slot name="title" />
          </h3>

          <slot name="title-infopop" />
        </div>

        <button class="btn ghost" @click="$emit('close')">
          Schließen
        </button>
      </div>

      <div class="modal-content">
        <slot name="content" />
      </div>

      <div class="row">
        <slot name="actions">
          <button class="btn ghost" @click="$emit('close')">
            Abbrechen
          </button>

          <slot name="action-btn">
            <button class="btn action">
              Bestätigen
            </button>
          </slot>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void; }>();
</script>

<style scoped>
.modal-card {
  background: var(--lbg);
  border: 1px solid var(--border);
  border-radius: var(--border-7);
  padding: 16px;
  width: calc(100% - 32px);
  max-width: 640px;
  max-height: calc(100% - 32px);
  overflow-y: scroll;
  position: fixed;
  text-align: left;
  z-index: 100001;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.modal-title {
  gap: 6px;
  align-items: center;
}

.modal-title-text {
  margin: 0;
  font-size: var(--font-size-h3);
  color: var(--text);
}
</style>