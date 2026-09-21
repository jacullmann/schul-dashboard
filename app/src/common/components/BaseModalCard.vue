<script setup lang="ts">
defineProps<{
  labelledby?: string;
  /**
   * Lifts the card and its backdrop over a fullscreen overlay that already
   * sits above the normal layers, such as the image viewer. Same layers as
   * BaseSheet's own `elevated`, so a dialog opened from the viewer behaves
   * the same on a phone and on a desktop.
   */
  elevated?: boolean;
}>();

defineEmits<{
  cancel: [];
}>();
</script>

<template>
  <BaseBackdrop
    blur-size="md"
    opacity="heavy"
    :class="elevated ? 'z-[100003]!' : ''"
    @cancel="$emit('cancel')"
  >
    <div
      class="bg-canvas border border-ghost-border rounded-2xl w-[calc(100%-2rem)] max-w-160 max-h-[min(56rem,calc(100dvh-5rem))] flex flex-col overflow-hidden fixed text-left z-(--z-modal)"
      :class="elevated ? 'z-[100004]!' : ''"
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
