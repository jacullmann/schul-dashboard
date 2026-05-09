<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { X, ChevronLeft, ChevronRight } from '@lucide/vue';

const props = defineProps<{
  visible: boolean;
  images: Array<{ url?: string; [key: string]: unknown }>;
  initialIndex: number;
}>();

const emit = defineEmits(['cancel']);

const currentIndex = ref(props.initialIndex);
const controlsVisible = ref(true);
const overlayRef = ref<HTMLElement | null>(null);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// Sync internal index when opening
watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentIndex.value = props.initialIndex;
      showControls();
      // Focus for keyboard support
      nextTick(() => overlayRef.value?.focus());
    }
  },
);

const currentImage = computed(() => props.images[currentIndex.value]);
const hasNext = computed(() => currentIndex.value < props.images.length - 1);
const hasPrev = computed(() => currentIndex.value > 0);

function next() {
  if (hasNext.value) {
    currentIndex.value++;
    // Re-focus overlay to ensure keyboard navigation keeps working
    // even if the button that was clicked disappears or loses focus.
    nextTick(() => overlayRef.value?.focus());
  }
}

function prev() {
  if (hasPrev.value) {
    currentIndex.value--;
    nextTick(() => overlayRef.value?.focus());
  }
}

function cancel() {
  emit('cancel');
}

// Keyboard Navigation
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') cancel();
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
}

// Activity / Auto-hide Logic
function showControls() {
  controlsVisible.value = true;
  if (hideTimeout) clearTimeout(hideTimeout);

  // Hide after 2 seconds of inactivity
  hideTimeout = setTimeout(() => {
    controlsVisible.value = false;
  }, 2000);
}

function onActivity() {
  showControls();
}

onBeforeUnmount(() => {
  if (hideTimeout) clearTimeout(hideTimeout);
});

// Disables Scrolling while viewing Image
watch(
  () => props.visible,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },
);
</script>

<template>
  <Transition name="fade">
    <BaseBackdrop
      v-if="visible"
      class="z-[100002] p-4"
      @mousemove="onActivity"
      @cancel="cancel"
      @touchstart="onActivity"
      tabindex="0"
      @keydown="handleKeydown"
      ref="overlayRef"
    >
      <div
        class="w-full h-full flex items-center justify-center"
        @click.self="cancel"
      >
        <img
          v-if="currentImage"
          :src="currentImage.url"
          class="max-w-full max-h-full rounded-xl object-contain shadow-menu transition-transform duration-200 ease-out"
          draggable="false"
          @click.stop
          alt=""
        />
      </div>

      <Transition name="fade-controls">
        <div v-show="controlsVisible" class="fixed inset-0 pointer-events-none">
          <button
            class="absolute top-4 right-4 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="cancel"
          >
            <X />
          </button>

          <button
            v-if="hasPrev"
            class="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="prev"
          >
            <ChevronLeft />
          </button>

          <button
            v-if="hasNext"
            class="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="next"
          >
            <ChevronRight />
          </button>

          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-[rgba(0,0,0,0.6)] px-3 py-1 rounded-full text-sm backdrop-blur-[4px] pointer-events-auto"
            @click.stop
          >
            {{ currentIndex + 1 }} / {{ images.length }}
          </div>
        </div>
      </Transition>
    </BaseBackdrop>
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-controls-enter-active,
.fade-controls-leave-active {
  transition: opacity 0.3s ease;
}
.fade-controls-enter-from,
.fade-controls-leave-to {
  opacity: 0;
}
</style>
