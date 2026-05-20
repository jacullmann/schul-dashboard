<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ZoomIn, ZoomOut } from '@lucide/vue';
import BaseModal from '@/common/components/BaseModal.vue';

const props = defineProps<{
  open: boolean;
  imageSrc: string;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'confirm', croppedBlob: Blob): void;
}>();

const { t } = useI18n();

const originalWidth = ref(0);
const originalHeight = ref(0);
const zoom = ref(1.0);
const x = ref(0);
const y = ref(0);
const processing = ref(false);

const boxSize = 320;
const cropSize = 224; // Circle cutout size (70% of 320px)

// Calculate scaling
const minScale = computed(() => {
  if (originalWidth.value === 0 || originalHeight.value === 0) return 1;
  return Math.max(cropSize / originalWidth.value, cropSize / originalHeight.value);
});

const scale = computed(() => zoom.value * minScale.value);
const imgW = computed(() => originalWidth.value * scale.value);
const imgH = computed(() => originalHeight.value * scale.value);

const imgStyle = computed(() => {
  return {
    width: `${imgW.value}px`,
    height: `${imgH.value}px`,
    transform: `translate3d(${(boxSize - imgW.value) / 2 + x.value}px, ${(boxSize - imgH.value) / 2 + y.value}px, 0)`,
    maxWidth: 'none',
    maxHeight: 'none',
  };
});

// Clamp position inside circular bounds
function clampPosition() {
  const maxX = Math.max(0, (imgW.value - cropSize) / 2);
  const maxY = Math.max(0, (imgH.value - cropSize) / 2);
  x.value = Math.max(-maxX, Math.min(maxX, x.value));
  y.value = Math.max(-maxY, Math.min(maxY, y.value));
}

// Re-clamp on zoom/scale change
watch(scale, () => {
  clampPosition();
});

// Load original dimensions when image changes
watch(
  () => props.imageSrc,
  (newSrc) => {
    if (!newSrc) return;
    const img = new Image();
    img.onload = () => {
      originalWidth.value = img.naturalWidth;
      originalHeight.value = img.naturalHeight;
      zoom.value = 1.0;
      x.value = 0;
      y.value = 0;
      clampPosition();
    };
    img.src = newSrc;
  },
  { immediate: true }
);

// Drag/Pan handling
let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;
let startX = 0;
let startY = 0;

function onPointerDown(e: PointerEvent) {
  e.preventDefault();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  isDragging = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  startX = x.value;
  startY = y.value;
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return;
  const dx = e.clientX - startMouseX;
  const dy = e.clientY - startMouseY;
  x.value = startX + dx;
  y.value = startY + dy;
  clampPosition();
}

function onPointerUp(e: PointerEvent) {
  if (!isDragging) return;
  isDragging = false;
  const el = e.currentTarget as HTMLElement;
  try {
    el.releasePointerCapture(e.pointerId);
  } catch {
    // Ignore if already released or invalid
  }
}

// Mouse Wheel Zoom
function onWheel(e: WheelEvent) {
  const delta = -e.deltaY * 0.003;
  zoom.value = Math.max(1.0, Math.min(4.0, zoom.value + delta));
}

// Process and submit cropped image
function applyCrop() {
  if (processing.value || !props.imageSrc) return;
  processing.value = true;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      processing.value = false;
      return;
    }

    // Set 512x512 premium avatar size
    canvas.width = 512;
    canvas.height = 512;

    const cropXImg = (imgW.value - cropSize) / 2 - x.value;
    const cropYImg = (imgH.value - cropSize) / 2 - y.value;

    const sourceX = cropXImg / scale.value;
    const sourceY = cropYImg / scale.value;
    const sourceSize = cropSize / scale.value;

    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);

    canvas.toBlob(
      (blob) => {
        processing.value = false;
        if (blob) {
          emit('confirm', blob);
        }
      },
      'image/jpeg',
      0.9
    );
  };
  img.src = props.imageSrc;
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="emit('cancel')"
    :submit="applyCrop"
    :loading="processing"
  >
    <template #title>
      {{ t('global.buttons.edit') || 'Bild anpassen' }}
    </template>

    <template #content>
      <div class="flex flex-col items-center gap-6 py-2 select-none">
        <!-- Interactive Cropping Container -->
        <div
          class="relative w-[320px] h-[320px] rounded-2xl bg-zinc-950/80 border border-white/10 overflow-hidden cursor-move touch-none"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
        >
          <img
            :src="imageSrc"
            alt="Crop source"
            class="absolute pointer-events-none origin-top-left"
            :style="imgStyle"
          />

          <!-- Semi-transparent overlay with circle cutout mask -->
          <svg
            class="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 320 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 0H320V320H0V0ZM160 272C221.858 272 272 221.858 272 160C272 98.1421 221.858 48 160 48C98.1421 48 48 98.1421 48 160C48 221.858 98.1421 272 160 272Z"
              fill="rgba(9, 9, 11, 0.72)"
              fill-rule="evenodd"
            />
            <circle
              cx="160"
              cy="160"
              r="112"
              stroke="rgba(255, 255, 255, 0.45)"
              stroke-width="1.5"
              stroke-dasharray="4 4"
            />
          </svg>
        </div>

        <!-- Zoom Slider -->
        <div class="flex items-center gap-3 w-full max-w-[280px]">
          <ZoomOut class="w-4 h-4 text-on-ghost-muted" />
          <input
            type="range"
            min="1.0"
            max="4.0"
            step="0.001"
            v-model.number="zoom"
            class="flex-1 cursor-pointer h-1.5 bg-white/10 hover:bg-white/15 rounded-lg appearance-none accent-action"
          />
          <ZoomIn class="w-4 h-4 text-on-ghost-muted" />
        </div>

        <p class="text-xs text-on-ghost-muted text-center m-0">
          Ziehen Sie das Bild zum Ausrichten. Benutzen Sie das Mausrad oder den Schieberegler zum Zoomen.
        </p>
      </div>
    </template>

    <template #action-text>
      {{ t('global.buttons.save') || 'Speichern' }}
    </template>
  </BaseModal>
</template>
