<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';

const { t } = useI18n();

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void }>();

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});
</script>

<template>
  <BaseModalCard @cancel="$emit('cancel')">
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

    <BaseForm :submit="() => $emit('success')" :cancellable="true">
      <template #content>
        <slot name="content"></slot>
      </template>

      <template #actions>
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
      </template>
    </BaseForm>
  </BaseModalCard>
</template>
