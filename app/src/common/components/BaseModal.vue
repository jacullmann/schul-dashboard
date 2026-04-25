<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { X } from '@lucide/vue';

const emit = defineEmits<{
  cancel: [];
  success: [];
}>();

const props = withDefaults(
  defineProps<{
    submit?: () => void;
    cancel?: () => void;
    danger?: boolean;
    error?: string;
    loading?: boolean;
  }>(),
  {
    danger: false,
    error: '',
    loading: false,
  },
);

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
    <BaseRow justify="between" class="items-start mb-4">
      <BaseRow>
        <h3 id="modal-title">
          <slot name="title"></slot>
        </h3>

        <slot name="title-infopop"></slot>
      </BaseRow>

      <BaseButton
        type="button"
        variant="ghost"
        :icon="X"
        class="absolute -top-3 -right-3"
        @click="handleCancel"
      />
    </BaseRow>

    <!-- Content -->
    <BaseForm
      v-if="submit"
      :submit="submit"
      :cancel="handleCancel"
      :error="error"
      :danger="danger"
      :loading="loading"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}"></slot>
      </template>
    </BaseForm>

    <!-- If there is no submit function, render the content without buttons -->
    <slot v-else name="content"></slot>
  </BaseModalCard>
</template>
