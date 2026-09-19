<script setup lang="ts">
/**
 * Backdrop for sticky headers inside scroll containers. Content scrolling
 * underneath fades into `color` and gets progressively more blurred towards
 * the top edge. Place it inside a positioned element that creates a stacking
 * context (e.g. `sticky z-10`) and size it with inset classes.
 */
withDefaults(
  defineProps<{
    color?: string;
  }>(),
  {
    color: 'var(--color-canvas)',
  },
);

const LAYER_COUNT = 8;
const MIN_BLUR = 0.5;
const MAX_BLUR = 12;

/*
 * Each layer covers an overlapping band (fade in, hold, fade out) one step
 * higher than the previous one, with a geometrically growing blur. The last
 * layer holds up to the top edge. Neighbouring bands cross-fade, so there
 * are no visible steps between blur strengths.
 */
const step = 100 / (LAYER_COUNT + 1);
const layers = Array.from({ length: LAYER_COUNT }, (_, i) => {
  const isLast = i === LAYER_COUNT - 1;
  const blur = MIN_BLUR * (MAX_BLUR / MIN_BLUR) ** (i / (LAYER_COUNT - 1));
  const stops = [
    `transparent ${i * step}%`,
    `#000 ${(i + 1) * step}%`,
    isLast ? '#000 100%' : `#000 ${(i + 2) * step}%`,
    isLast ? '' : `transparent ${Math.min((i + 3) * step, 100)}%`,
  ].filter(Boolean);

  return {
    '--blur': `${blur.toFixed(2)}px`,
    '--mask': `linear-gradient(to top, ${stops.join(', ')})`,
  };
});
</script>

<template>
  <div
    aria-hidden="true"
    class="scroll-fade pointer-events-none absolute -z-10"
    :style="{ '--scroll-fade-color': color }"
  >
    <div
      v-for="(layer, i) in layers"
      :key="i"
      class="scroll-fade__blur"
      :style="layer"
    ></div>
    <div class="scroll-fade__tint"></div>
  </div>
</template>

<style scoped>
.scroll-fade > * {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.scroll-fade__blur {
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
  -webkit-mask-image: var(--mask);
  mask-image: var(--mask);
}

/* Eased fade instead of a linear one, which would show a visible edge. */
.scroll-fade__tint {
  background: linear-gradient(
    to top,
    transparent 0%,
    color-mix(in oklab, var(--scroll-fade-color) 20%, transparent) 20%,
    color-mix(in oklab, var(--scroll-fade-color) 50%, transparent) 45%,
    color-mix(in oklab, var(--scroll-fade-color) 80%, transparent) 70%,
    var(--scroll-fade-color) 100%
  );
}
</style>
