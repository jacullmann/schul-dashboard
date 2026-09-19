<script setup lang="ts">
defineProps<{
  labelledby?: string;
}>();

defineEmits<{
  cancel: [];
}>();
</script>

<template>
  <BaseBackdrop blur-size="md" opacity="heavy" @cancel="$emit('cancel')">
    <div
      class="bg-canvas border border-ghost-border rounded-2xl w-[calc(100%-2rem)] max-w-160 max-h-[min(56rem,calc(100dvh-5rem))] flex flex-col overflow-hidden fixed text-left z-(--z-modal)"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledby"
      @click.stop
    >
      <!-- Outside the scroller, so a scrollbar never shifts it. First in the
           DOM to keep it first in tab order. -->
      <div v-if="$slots.corner" class="absolute top-1 right-1 z-20">
        <slot name="corner"></slot>
      </div>

      <div class="min-h-0 p-4 overflow-y-auto overscroll-contain">
        <slot></slot>
      </div>
    </div>
  </BaseBackdrop>
</template>
