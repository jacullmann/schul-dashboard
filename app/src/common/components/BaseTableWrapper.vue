<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(
  defineProps<{
    fadeWidth?: number;
    scrollbarHide?: boolean;
  }>(),
  {
    fadeWidth: 32,
    scrollbarHide: true,
  },
);

const wrapperRef = ref<HTMLElement | null>(null);
const showLeftFade = ref(false);
const showRightFade = ref(false);

function updateFade() {
  const el = wrapperRef.value;
  if (!el) return;
  showLeftFade.value = el.scrollLeft > 1;
  showRightFade.value = el.scrollWidth - el.scrollLeft - el.clientWidth > 1;
}

let ticking = false;
function handleScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateFade();
      ticking = false;
    });
    ticking = true;
  }
}

const maskStyle = computed(() => {
  const left = showLeftFade.value;
  const right = showRightFade.value;
  const fw = props.fadeWidth;

  let mask = 'none';
  if (left && right) {
    mask = `linear-gradient(to right, transparent 0px, black ${fw}px, black calc(100% - ${fw}px), transparent 100%)`;
  } else if (left) {
    mask = `linear-gradient(to right, transparent 0px, black ${fw}px)`;
  } else if (right) {
    mask = `linear-gradient(to left, transparent 0px, black ${fw}px)`;
  }
  return {
    webkitMaskImage: mask,
    maskImage: mask,
  };
});

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateFade();
  window.addEventListener('resize', updateFade);

  const el = wrapperRef.value;
  if (el) {
    resizeObserver = new ResizeObserver(() => {
      updateFade();
    });
    resizeObserver.observe(el);
    for (const child of el.children) {
      resizeObserver.observe(child);
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateFade);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="overflow-x-auto w-full transition-all duration-300"
    :class="{ 'scrollbar-hide': scrollbarHide }"
    :style="maskStyle"
    @scroll="handleScroll"
  >
    <slot />
  </div>
</template>
