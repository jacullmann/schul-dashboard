<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void; }>();

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="blurit" @click.self="$emit('cancel')" aria-hidden="true">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <div class="modal-title">
          <h3 id="modal-title" class="modal-title-text">
            <slot name="title"></slot>
          </h3>

          <slot name="title-infopop"></slot>
        </div>

        <button type="button" class="btn ghost" @click="$emit('cancel')">
          {{ t('global.buttons.close') }}
        </button>
      </div>

      <div class="modal-content">
        <slot name="content"></slot>
      </div>

      <div class="row">
        <slot name="actions">
          <button type="button" class="btn ghost" @click="$emit('cancel')">
            {{ t('global.buttons.cancel') }}
          </button>

          <slot name="action-btn">
            <button type="button" class="btn action">
              {{ t('global.buttons.confirm') }}
            </button>
          </slot>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-card {
  background: var(--bg-canvas);
  border: 1px solid var(--border-canvas);
  border-radius: var(--border-radius-2xl);
  padding: 16px;
  width: calc(100% - 32px);
  max-width: 640px;
  max-height: calc(100% - 32px);
  overflow-y: auto;
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
  display: flex;
  justify-content: left;
}

.modal-title-text {
  margin: 0;
  font-size: var(--font-size-h3);
  color: var(--text-default);
}
</style>