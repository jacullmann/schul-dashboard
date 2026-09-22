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
      class="bg-canvas rounded-2xl w-[calc(100%-2rem)] max-w-160 max-h-[min(56rem,calc(100dvh-5rem))] flex flex-col fixed text-left z-(--z-modal)"
      :class="elevated ? 'z-[100004]!' : ''"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledby"
      @click.stop
    >
      <!-- Border drawn above the scroller, which reaches the card's outer
           edge. Under a border of the card's own, the anti-aliased pixels
           along the scroller's clip would let the page show through. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-30 rounded-2xl border border-ghost-border"
      />

      <!-- Outside the scroller, so a scrollbar never shifts it. First in the
           DOM to keep it first in tab order. -->
      <div v-if="$slots.corner" class="absolute top-1 right-1 z-20">
        <slot name="corner"></slot>
      </div>

      <!-- Clips its content and the sticky fades (BaseScrollFade) as one, so
           a fade always covers the content right up to the edge. A rounded
           overflow clip on the card would instead clip each composited layer
           on its own: their anti-aliased edge pixels blend, leaving a fringe
           of unblurred content at fractional positions and along the curve.
           The opacity flattens the scroller into one surface that the clip
           path then cuts; just short of 1, so Chromium never takes the
           surface as fully opaque and skips painting what lies under its
           anti-aliased edge. It also makes the scroller the backdrop the fades
           blur, hence the opaque background: over a transparent one the
           blurred copy is translucent, and the sharp content shows through. -->
      <div
        class="min-h-0 p-4 overflow-y-auto overscroll-contain bg-canvas opacity-[.999] [clip-path:inset(0_round_var(--radius-2xl))]"
      >
        <slot></slot>
      </div>
    </div>
  </BaseBackdrop>
</template>
