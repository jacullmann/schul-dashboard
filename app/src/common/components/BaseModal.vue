<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  submit?: () => void;
  cancel?: () => void;
  danger?: boolean;
  error?: string;
  loading?: boolean;
}>(), {
  cancel: () => { emit('cancel') },
  danger: false,
  error: '',
  loading: false,
});

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void }>();

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});
</script>

<template>
  <BaseModalCard @cancel="$emit('cancel')">
    <!-- Header-->
    <BaseRow justify="between" class="mb-4">
      <BaseTitle :level="3">
        <slot name="title"></slot>

        <template #info>
          <slot name="title-infopop"></slot>
        </template>
      </BaseTitle>

      <BaseButton v-if="cancel" type="button" variant="ghost" @click="cancel">
        {{ t('global.buttons.close') }}
      </BaseButton>
    </BaseRow>

    <!-- Content -->
    <BaseForm v-if="submit" :submit="submit" :cancel="cancel" :error="error" :danger="danger" :loading="loading">
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}"></slot>
      </template>
    </BaseForm>

    <!-- If there is no submit function, render the content without buttons -->
    <slot v-else name="content"></slot>
  </BaseModalCard>
</template>
