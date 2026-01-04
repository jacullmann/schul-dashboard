<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface Props {
  beforeImage?: string;
  afterImage?: string;
  initialPosition?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialPosition: 50,
  beforeImage: 'https://images.unsplash.com/photo-1598928636135-d146006ff4be?q=80&w=2000&auto=format&fit=crop',
  afterImage: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767566360/Screenshot_2026-01-04_233906_olgjdv.png'
});

const containerRef = ref<HTMLElement | null>(null);
const sliderPosition = ref(props.initialPosition);
const isDragging = ref(false);

const updatePosition = (clientX: number) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const x = clientX - rect.left;
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
  sliderPosition.value = percentage;
};

const startDrag = () => (isDragging.value = true);
const stopDrag = () => (isDragging.value = false);

const onMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  // Type guard to handle MouseEvent vs TouchEvent safely
  let clientX: number;
  if ('touches' in e) {
    clientX = e.touches[0].clientX;
  } else {
    clientX = e.clientX;
  }
  updatePosition(clientX);
};

onMounted(() => {
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchend', stopDrag);
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('touchmove', onMove);
});

const foregroundStyle = computed(() => ({
  clipPath: `polygon(0 0, ${sliderPosition.value}% 0, ${sliderPosition.value}% 100%, 0 100%)`
}));

const handleStyle = computed(() => ({
  left: `${sliderPosition.value}%`,
}));
</script>

<template>
  <div
      ref="containerRef"
      class="compare-container"
      @mousedown="startDrag"
      @touchstart="startDrag"
  >
    <img
        :src="props.afterImage"
        class="img-layer img-background"
        alt="After"
        draggable="false"
    />

    <img
        :src="props.beforeImage"
        class="img-layer img-foreground"
        alt="Before"
        draggable="false"
        :style="foregroundStyle"
    />

    <div class="handle" :style="handleStyle">
      <div class="handle-line"></div>
      <div class="handle-circle">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg);">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-container {
  position: relative;
  width: 100%;
  /* Removed height: 100% so it can adapt to image height naturally */
  overflow: hidden;
  cursor: ew-resize;
  user-select: none;
  touch-action: none;
  /* Ensures the container respects the image aspect ratio */
  display: inline-block;
  vertical-align: top;
}

.img-layer {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  border-radius:8px;
}

/* FIX: The background image is now relative.
  This forces the container to expand to fit the image's height.
*/
.img-background {
  position: relative;
  height: auto;
}

/* FIX: The foreground image remains absolute
  to sit directly on top of the background.
*/
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
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: #aaa;
  transition: color 0.1s;
}

.handle-circle:hover {
  color: #fff
}
</style>