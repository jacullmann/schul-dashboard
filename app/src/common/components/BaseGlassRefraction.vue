<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useRefractionMap } from '@/common/composables/useRefractionMap';
import { usePlatform } from '@/common/composables/usePlatform';

/**
 * Bends the backdrop along the rim of a fully rounded glass surface, like
 * the edge of a lens. It fills its positioned parent and belongs right before
 * the surface, which keeps its own blur on top.
 */

// Only Chromium runs SVG filters in `backdrop-filter`. Elsewhere the surface
// stays frosted glass, without paying for a map nothing would read.
const { isChromium } = usePlatform();

const layerRef = ref<HTMLElement | null>(null);
const filterId = useId();
const { width, height, href, scale } = useRefractionMap(layerRef);

const layerStyle = computed(() =>
  href.value ? { backdropFilter: `url(#${filterId})` } : undefined,
);
</script>

<template>
  <div
    v-if="isChromium"
    ref="layerRef"
    class="pointer-events-none absolute inset-0 rounded-full"
    :style="layerStyle"
    aria-hidden="true"
  >
    <svg class="absolute size-0">
      <filter
        :id="filterId"
        color-interpolation-filters="sRGB"
        primitiveUnits="userSpaceOnUse"
      >
        <feImage
          v-if="href"
          :href="href"
          x="0"
          y="0"
          :width="width"
          :height="height"
          preserveAspectRatio="none"
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          :scale="scale"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  </div>
</template>
