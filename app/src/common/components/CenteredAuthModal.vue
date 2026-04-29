<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

defineProps<{
  title: string;
  closeOnBackdrop?: boolean;
}>();

defineOptions({
  name: 'CenteredAuthModal',
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close');
  }
});

function handleBackdropClick() {
  emit('close');
}
</script>

<template>
  <div
    class="fixed flex items-center justify-center p-4 z-50"
    @click.self="closeOnBackdrop !== false && handleBackdropClick()"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-labelledby="title"
      class="w-full max-w-[420px] bg-canvas border border-canvas-border rounded-lg p-6 shadow-lg"
    >
      <div class="mb-6">
        <h2 :id="title" class="text-xl font-semibold text-on-ghost m-0">
          {{ title }}
        </h2>
      </div>
      <div class="mb-6">
        <slot />
      </div>
      <div class="flex gap-3 justify-end">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
