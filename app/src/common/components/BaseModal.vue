<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';

const { t } = useI18n();

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void; }>();

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});
</script>

<template>
  <div class="blurit" @click.self="$emit('cancel')" aria-hidden="true">
    <div class="bg-canvas border border-canvas-border rounded-2xl p-4 w-[calc(100%-32px)] max-w-160 max-h-[calc(100%-32px)] overflow-y-auto fixed text-left z-100001" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <BaseRow justify="between" class="mb-4">
        <BaseTitle :level="3">
          <slot name="title"></slot>

          <template #info>
            <slot name="title-infopop"></slot>
          </template>
        </BaseTitle>

        <BaseButton type="button" @click="$emit('cancel')" variant="ghost">
          {{ t('global.buttons.close') }}
        </BaseButton>
      </BaseRow>

      <slot name="content"></slot>

      <BaseRow justify="end" class="mt-4">
        <slot name="actions">
          <BaseButton type="button" @click="$emit('cancel')" variant="ghost">
            {{ t('global.buttons.cancel') }}
          </BaseButton>

          <slot name="action-btn">
            <BaseButton type="submit" variant="action">
              {{ t('global.buttons.confirm') }}
            </BaseButton>
          </slot>
        </slot>
      </BaseRow>
    </div>
  </div>
</template>
