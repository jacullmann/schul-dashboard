<script setup lang="ts">
/**
 * Backdrop for sticky headers inside scroll containers. Content scrolling
 * underneath fades into `color` and gets progressively more blurred towards
 * the top edge. Place it inside a positioned element that creates a stacking
 * context (e.g. `sticky z-10`) and size it with inset classes, so its top and
 * sides sit on the scroll container's edges.
 *
 * The layers bleed a little past those three edges, leaving the scroll
 * container's clip as the only edge. Its clip and the backdrop filters snap to
 * device pixels differently, so flush edges leave seams at fractional
 * positions where content shows through unblurred. That clip must also cut
 * the content and the fade as one surface; see BaseModalCard's scroller.
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
const MAX_BLUR = 8;
const MAX_BLUR_FROM_BOTTOM = 70;

/*
 * No masks: WebKit drops a mask's backing store once it takes the layer for
 * off-screen, and rubber-banding past the end of the page does that to a fixed
 * header, so its blur vanished outright. Instead each layer reaches from the
 * top edge down to its band and they stack, each blurring what the ones below
 * already blurred. Blurs compose as the root of the sum of squares, so a layer
 * only adds what brings the total up to its band's step on a geometric scale.
 * The blur peaks below the tint's full color so content is fully blurred
 * before it fades out; the last layer holds that from its band to the top edge.
 */
const step = MAX_BLUR_FROM_BOTTOM / LAYER_COUNT;
const totalBlur = (i: number) =>
  MIN_BLUR * (MAX_BLUR / MIN_BLUR) ** (i / (LAYER_COUNT - 1));
const layers = Array.from({ length: LAYER_COUNT }, (_, i) => {
  const blur = Math.sqrt(totalBlur(i) ** 2 - (i ? totalBlur(i - 1) ** 2 : 0));

  return {
    '--blur': `${blur.toFixed(2)}px`,
    '--band-bottom': `${(i + 1) * step}%`,
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
.scroll-fade {
  --scroll-fade-bleed: 2px;
}

.scroll-fade > * {
  position: absolute;
  inset: calc(-1 * var(--scroll-fade-bleed)) calc(-1 * var(--scroll-fade-bleed))
    0;
}

.scroll-fade__blur {
  bottom: var(--band-bottom);
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
}

/* Eased fade instead of a linear one, which would show a visible edge. */
.scroll-fade__tint {
  background: linear-gradient(
    to top,
    transparent 0%,
    color-mix(in oklab, var(--scroll-fade-color) 20%, transparent) 20%,
    color-mix(in oklab, var(--scroll-fade-color) 50%, transparent) 45%,
    color-mix(in oklab, var(--scroll-fade-color) 80%, transparent) 70%,
    var(--scroll-fade-color) calc(100% - var(--scroll-fade-bleed))
  );
}
</style>
