<template>
  <transition name="fade">
    <div
        v-if="visible"
        class="viewer-overlay"
        @mousemove="onActivity"
        @click="close"
        @touchstart="onActivity"
        tabindex="0"
        @keydown="handleKeydown"
        ref="overlayRef"
    >
      <div class="image-wrapper">
        <img
            :src="currentImage?.url"
            class="viewer-img"
            draggable="false"
            @click.stop
        />
      </div>

      <transition name="fade-controls">
        <div v-show="controlsVisible" class="controls-ui">

          <button class="control-btn close-btn" @click.stop="close">
            <X />
          </button>

          <button
              v-if="hasPrev"
              class="control-btn nav-btn prev"
              @click.stop="prev"
          >
            <ChevronLeft />
          </button>

          <button
              v-if="hasNext"
              class="control-btn nav-btn next"
              @click.stop="next"
          >
            <ChevronRight />
          </button>

          <div class="counter" @click.stop>
            {{ currentIndex + 1 }} / {{ images.length }}
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  images: Array<{ url: string; [key: string]: any }>;
  initialIndex: number;
}>();

const emit = defineEmits(['close']);

const currentIndex = ref(props.initialIndex);
const controlsVisible = ref(true);
const overlayRef = ref<HTMLElement | null>(null);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// Sync internal index when opening
watch(() => props.visible, (val) => {
  if (val) {
    currentIndex.value = props.initialIndex;
    showControls();
    // Focus for keyboard support
    nextTick(() => overlayRef.value?.focus());
  }
});

const currentImage = computed(() => props.images[currentIndex.value]);
const hasNext = computed(() => currentIndex.value < props.images.length - 1);
const hasPrev = computed(() => currentIndex.value > 0);

function next() {
  if (hasNext.value) currentIndex.value++;
}

function prev() {
  if (hasPrev.value) currentIndex.value--;
}

function close() {
  emit('close');
}

// Keyboard Navigation
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
}

// Activity / Auto-hide Logic
function showControls() {
  controlsVisible.value = true;
  if (hideTimeout) clearTimeout(hideTimeout);

  // Hide after 1 second of inactivity
  hideTimeout = setTimeout(() => {
    controlsVisible.value = false;
  }, 1000);
}

function onActivity() {
  showControls();
}

onBeforeUnmount(() => {
  if (hideTimeout) clearTimeout(hideTimeout);
});

// Disables Scrolling while viewing Image
watch(() => props.visible, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'; // Stop scrolling
    // ... existing logic
  } else {
    document.body.style.overflow = ''; // Re-enable scrolling
  }
});
</script>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  user-select: none;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.viewer-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.controls-ui {
  position: absolute;
  inset: 0;
  pointer-events: none; /* Let clicks pass through to background/image */
}

/* Button Reset & Base Styles */
.control-btn {
  pointer-events: auto; /* Re-enable clicks for buttons */
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  cursor: pointer;
  padding: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.1s;
  backdrop-filter: blur(4px);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn:active {
  transform: scale(0.95);
}

/* Positioning */
.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.prev { left: 20px; }
.next { right: 20px; }

.counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  background: rgba(0,0,0,0.5);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-controls-enter-active, .fade-controls-leave-active { transition: opacity 0.3s ease; }
.fade-controls-enter-from, .fade-controls-leave-to { opacity: 0; }
</style>