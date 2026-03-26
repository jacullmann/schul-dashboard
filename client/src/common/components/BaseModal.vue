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
    <div class="bg-canvas border border-canvas-border rounded-2xl p-4 w-[calc(100%-32px)] max-w-[640px] max-h-[calc(100%-32px)] overflow-y-auto position-fixed text-left z-100001" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="flex flex-start justify-between gap-2 mb-4">
        <div class="flex items-center justify-start gap-[6px]">
          <h3 id="modal-title" class="text-h3 text-on-surface m-0">
            <slot name="title"></slot>
          </h3>

          <slot name="title-infopop"></slot>
        </div>

        <BaseButton type="button" @click="$emit('cancel')" variant="ghost">
          {{ t('global.buttons.close') }}
        </BaseButton>
      </div>

      <div class="modal-content">
        <slot name="content"></slot>
      </div>

      <div class="row">
        <slot name="actions">
          <BaseButton type="button" @click="$emit('cancel')" variant="ghost">
            {{ t('global.buttons.cancel') }}
          </BaseButton>

          <slot name="action-btn">
            <BaseButton type="button" variant="action">
              {{ t('global.buttons.confirm') }}
            </BaseButton>
          </slot>
        </slot>
      </div>
    </div>
  </div>
</template>
