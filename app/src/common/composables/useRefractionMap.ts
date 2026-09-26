import { computed, type MaybeRefOrGetter } from 'vue';
import { useElementSize } from '@vueuse/core';

/** How far in from the rim the glass curves, as a share of the pill's height. */
const BEZEL_RATIO = 0.3;
/** How far the rim bends the backdrop at most, as a share of the pill's height. */
const DISPLACEMENT_RATIO = 0.3;

/** The channel value `feDisplacementMap` reads as no displacement. */
const NEUTRAL = 128;
const MAX_OFFSET = 127;

/**
 * How much of the full bend a point `depth` of the way from the flat centre to
 * the rim gets: the slope of a quarter-circle profile, so the glass stays flat
 * over most of the bezel and bends ever more steeply towards the rim.
 */
function bend(depth: number): number {
  return 1 - Math.sqrt(1 - depth * depth);
}

/**
 * Paints a displacement map for a fully rounded rectangle: red and green hold
 * how far each pixel pulls its backdrop sideways and down. Along the bezel,
 * every pixel shows the backdrop from further in towards the centre, the way
 * the curved rim of a lens gathers what lies behind it.
 */
function paintRefractionMap(width: number, height: number, bezel: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(width, height);
  const radius = Math.min(width, height) / 2;
  const straightX = width / 2 - radius;
  const straightY = height / 2 - radius;

  for (let y = 0; y < height; y++) {
    const fromCenterY = y + 0.5 - height / 2;
    const overY = Math.abs(fromCenterY) - straightY;

    for (let x = 0; x < width; x++) {
      const fromCenterX = x + 0.5 - width / 2;
      const overX = Math.abs(fromCenterX) - straightX;

      // The outward normal and distance to the rim, measured from the nearest
      // point on the rectangle the rounded ends are drawn around.
      let normalX = 0;
      let normalY = 0;
      let fromCore: number;
      if (overX > 0 && overY > 0) {
        fromCore = Math.hypot(overX, overY);
        normalX = overX / fromCore;
        normalY = overY / fromCore;
      } else if (overX > overY) {
        fromCore = overX;
        normalX = 1;
      } else {
        fromCore = overY;
        normalY = 1;
      }
      normalX *= Math.sign(fromCenterX);
      normalY *= Math.sign(fromCenterY);

      const depth = Math.min(1, Math.max(0, 1 - (radius - fromCore) / bezel));
      const pull = bend(depth) * MAX_OFFSET;

      const i = (y * width + x) * 4;
      image.data[i] = NEUTRAL - normalX * pull;
      image.data[i + 1] = NEUTRAL - normalY * pull;
      image.data[i + 2] = NEUTRAL;
      image.data[i + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/**
 * A displacement map sized to `target`, a fully rounded element, for an
 * `feDisplacementMap` that bends its backdrop like a curved glass rim.
 */
export function useRefractionMap(target: MaybeRefOrGetter<HTMLElement | null>) {
  const size = useElementSize(
    target,
    { width: 0, height: 0 },
    { box: 'border-box' },
  );
  const width = computed(() => Math.round(size.width.value));
  const height = computed(() => Math.round(size.height.value));

  const href = computed(() =>
    width.value && height.value
      ? paintRefractionMap(
          width.value,
          height.value,
          height.value * BEZEL_RATIO,
        )
      : null,
  );
  // The map spans the channel's full range, which the filter reads as ±scale / 2.
  const scale = computed(() => 2 * height.value * DISPLACEMENT_RATIO);

  return { width, height, href, scale };
}
