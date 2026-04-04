<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useElementBounding } from '@vueuse/core';

interface Props {
  beforeImage?: string;
  afterImage?: string;
  initialPosition?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialPosition: 50,
  beforeImage:
    'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767543949/comparison_files_nisd5i.webp',
  afterImage:
    'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767566360/Screenshot_2026-01-04_233906_olgjdv.png',
});

const containerRef = ref<HTMLElement | null>(null);
const sliderPosition = ref(props.initialPosition);
const isDragging = ref(false);

const { left: containerLeft, width: containerWidth } = useElementBounding(containerRef);

const updatePosition = (clientX: number) => {
  if (containerWidth.value === 0) return;
  const x = clientX - containerLeft.value;
  sliderPosition.value = Math.max(0, Math.min(100, (x / containerWidth.value) * 100));
};

onMounted(() => {
  if (typeof window === 'undefined') return;

  const handleMouseUp = () => (isDragging.value = false);
  const handleTouchEnd = () => (isDragging.value = false);
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) updatePosition(e.clientX);
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging.value && e.touches[0]) updatePosition(e.touches[0].clientX);
  };

  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('touchmove', handleTouchMove);

  return () => {
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
  };
});

const foregroundStyle = computed(() => ({
  clipPath: `polygon(0 0, ${sliderPosition.value}% 0, ${sliderPosition.value}% 100%, 0 100%)`,
}));

const handleStyle = computed(() => ({ left: `${sliderPosition.value}%` }));
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full overflow-hidden cursor-col-resize select-none"
    style="touch-action: none;"
    @mousedown="isDragging = true"
    @touchstart="isDragging = true"
  >
    <img :src="props.afterImage" class="block w-full h-auto object-cover select-none rounded-md" alt="After" draggable="false" />
    <img
      :src="props.beforeImage"
      class="absolute top-0 left-0 w-full h-full object-cover select-none"
      alt="Before"
      draggable="false"
      :style="foregroundStyle"
    />
    <div class="absolute top-0 bottom-0 w-0.5 bg-steel z-20 -translate-x-1/2 flex items-center justify-center pointer-events-none" :style="{ ...handleStyle, boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)' }">
      <div class="w-12 h-12 bg-graphite/70 border border-ash/30 rounded-full flex items-center justify-between px-2 shadow-md backdrop-blur" style="boxShadow: 0 4px 12px rgba(0, 0, 0, 0.4);">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="text-ash">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="text-ash" style="transform: rotate(180deg)">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    </div>
  </div>
</template>
