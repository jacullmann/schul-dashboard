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
    class="compare-container"
    @mousedown="isDragging = true"
    @touchstart="isDragging = true"
  >
    <img :src="props.afterImage" class="img-layer img-background" alt="After" draggable="false" />
    <img
      :src="props.beforeImage"
      class="img-layer img-foreground"
      alt="Before"
      draggable="false"
      :style="foregroundStyle"
    />
    <div class="handle" :style="handleStyle">
      <div class="handle-circle">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="transform: rotate(180deg)">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  cursor: ew-resize;
  user-select: none;
  touch-action: none;
  display: inline-block;
  vertical-align: top;
}

.img-layer {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  border-radius: 8px;
}

.img-background {
  position: relative;
  height: auto;
}

.img-foreground {
  position: absolute;
  top: 0;
  left: 0;
}

.handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #666;
  z-index: 20;
  transform: translateX(-50%);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.handle-circle {
  width: 48px;
  height: 48px;
  background: #414141b0;
  border: 1px solid #aaa5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  color: #aaa;
}
</style>
