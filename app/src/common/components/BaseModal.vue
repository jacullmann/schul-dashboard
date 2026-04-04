<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';

const { t } = useI18n();

const emit = defineEmits<{
  cancel: [];
  success: [];
}>();

const props = withDefaults(defineProps<{
  submit?: () => void;
  cancel?: () => void;
  danger?: boolean;
  error?: string;
  loading?: boolean;
}>(), {
  danger: false,
  error: '',
  loading: false,
});

const handleCancel = () => {
  if (props.cancel) {
    props.cancel();
  } else {
    emit('cancel');
  }
};

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleCancel();
});
</script>

<template>
  <BaseModalCard @cancel="handleCancel">
    <!-- Header-->
    <BaseRow justify="between" class="mb-4">
      <BaseTitle :level="3">
        <slot name="title"></slot>

        <template #info>
          <slot name="title-infopop"></slot>
        </template>
      </BaseTitle>

      <BaseButton type="button" variant="ghost" @click="handleCancel">
        {{ t('global.buttons.close') }}
      </BaseButton>
    </BaseRow>

    <!-- Content -->
    <BaseForm v-if="submit" :submit="submit" :cancel="handleCancel" :error="error" :danger="danger" :loading="loading">
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}"></slot>
      </template>
    </BaseForm>

    <!-- If there is no submit function, render the content without buttons -->
    <slot v-else name="content"></slot>
  </BaseModalCard>
</template>
