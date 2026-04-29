<script setup lang="ts">
import { RotateCw, RotateCcw } from '@lucide/vue';
import { ref, reactive, computed, watch } from 'vue';
import { useElementBounding, useEventListener } from '@vueuse/core';

// --- Types ---
interface CropState {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageMeta {
  naturalWidth: number;
  naturalHeight: number;
}

// --- State ---
const fileInputRef = ref<HTMLInputElement | null>(null);
const editorImageRef = ref<HTMLImageElement | null>(null);
const workspaceRef = ref<HTMLElement | null>(null);

const currentImageSrc = ref('');
const hasImage = computed(() => !!currentImageSrc.value);
const isDraggingFile = ref(false);

const imageMeta = reactive<ImageMeta>({ naturalWidth: 0, naturalHeight: 0 });

const settings = reactive({
  format: 'image/jpeg',
  quality: 90,
  width: null as number | null,
  height: null as number | null,
});

// Editor State
const isEditorOpen = ref(false);
const isCropInitialized = ref(false);
const crop = reactive<CropState>({ x: 0, y: 0, w: 0, h: 0 });

// Reactive element bounds — update via ResizeObserver, return 0 when unmounted
const {
  width: imgRenderedWidth,
  left: imgLeft,
  top: imgTop,
} = useElementBounding(editorImageRef);
const { left: workspaceLeft, top: workspaceTop } =
  useElementBounding(workspaceRef);

// editorScale reacts to the image's rendered width — no imperative DOM reads needed
const editorScale = computed(() =>
  imageMeta.naturalWidth > 0 && imgRenderedWidth.value > 0
    ? imgRenderedWidth.value / imageMeta.naturalWidth
    : 1,
);

// Dragging Logic State
let isDragging = false;
let resizeDir = '';
let startMouseX = 0;
let startMouseY = 0;
let boxStart = { x: 0, y: 0, w: 0, h: 0 };

// --- File Handling ---
const triggerUpload = () => fileInputRef.value?.click();

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) loadFile(file);
};

const handleDrop = (e: DragEvent) => {
  isDraggingFile.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) loadFile(file);
};

const loadFile = (file: File) => {
  if (!file.type.startsWith('image/')) return alert('Not an image');

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    // We create a temporary Image object to get natural dimensions immediately
    const img = new Image();
    img.onload = () => {
      currentImageSrc.value = result;
      imageMeta.naturalWidth = img.naturalWidth;
      imageMeta.naturalHeight = img.naturalHeight;

      // Reset settings
      settings.width = img.naturalWidth;
      settings.height = img.naturalHeight;
    };
    img.src = result;
  };
  reader.readAsDataURL(file);
};

// --- Conversion Logic ---
const convertAndDownload = () => {
  if (!hasImage.value) return;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = settings.width || imageMeta.naturalWidth;
    const h = settings.height || imageMeta.naturalHeight;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    try {
      const qualityDec = settings.quality / 100;
      const dataUrl = canvas.toDataURL(settings.format, qualityDec);
      const link = document.createElement('a');
      const ext = settings.format.split('/')[1];
      link.download = `converted_${Date.now()}.${ext}`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert('Error converting file.');
    }
  };
  img.src = currentImageSrc.value;
};

// --- Editor Logic ---

// Initialize crop box once the editor image is in the DOM and has non-zero dimensions
watch(imgRenderedWidth, (width) => {
  if (width > 0 && isEditorOpen.value && !isCropInitialized.value) {
    const initW = imageMeta.naturalWidth * 0.5;
    const initH = imageMeta.naturalHeight * 0.5;
    const initX = (imageMeta.naturalWidth - initW) / 2;
    const initY = (imageMeta.naturalHeight - initH) / 2;
    setCrop(initX, initY, initW, initH);
    isCropInitialized.value = true;
  }
});

const openEditor = () => {
  isEditorOpen.value = true;
  isCropInitialized.value = false;
};

const closeEditor = () => {
  isEditorOpen.value = false;
  isCropInitialized.value = false;
};

// Core function to update crop state with bounds checking
const setCrop = (x: number, y: number, w: number, h: number) => {
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > imageMeta.naturalWidth) w = imageMeta.naturalWidth - x;
  if (y + h > imageMeta.naturalHeight) h = imageMeta.naturalHeight - y;

  crop.x = Math.round(x);
  crop.y = Math.round(y);
  crop.w = Math.round(w);
  crop.h = Math.round(h);
};

// Computed style for the visual crop box
// Offset the box by the image's position within the workspace (handles padding/centering)
const cropBoxStyle = computed(() => {
  const relLeft = imgLeft.value - workspaceLeft.value;
  const relTop = imgTop.value - workspaceTop.value;
  return {
    left: `${crop.x * editorScale.value + relLeft}px`,
    top: `${crop.y * editorScale.value + relTop}px`,
    width: `${crop.w * editorScale.value}px`,
    height: `${crop.h * editorScale.value}px`,
  };
});

// Manual Input Handler
const updateCropFromInput = () => {
  setCrop(crop.x, crop.y, crop.w, crop.h);
};

// --- Drag & Resize Logic ---

const startDrag = (e: MouseEvent, direction: string | false) => {
  if (direction) {
    resizeDir = direction;
    isDragging = false;
  } else {
    isDragging = true;
    resizeDir = '';
  }

  startMouseX = e.clientX;
  startMouseY = e.clientY;

  // Snapshot current state
  boxStart = { ...crop };
};

const handleGlobalMouseMove = (e: MouseEvent) => {
  if (!isDragging && !resizeDir) return;

  // Calculate delta in Natural Pixels
  const dx = (e.clientX - startMouseX) / editorScale.value;
  const dy = (e.clientY - startMouseY) / editorScale.value;

  if (isDragging) {
    setCrop(boxStart.x + dx, boxStart.y + dy, boxStart.w, boxStart.h);
  } else if (resizeDir) {
    // Calculate new dimensions based on direction
    let newX = boxStart.x;
    let newY = boxStart.y;
    let newW = boxStart.w;
    let newH = boxStart.h;

    // North
    if (resizeDir.includes('n')) {
      newY = boxStart.y + dy;
      newH = boxStart.h - dy;
    }
    // South
    if (resizeDir.includes('s')) {
      newH = boxStart.h + dy;
    }
    // West
    if (resizeDir.includes('w')) {
      newX = boxStart.x + dx;
      newW = boxStart.w - dx;
    }
    // East
    if (resizeDir.includes('e')) {
      newW = boxStart.w + dx;
    }

    setCrop(newX, newY, newW, newH);
  }
};

const handleGlobalMouseUp = () => {
  isDragging = false;
  resizeDir = '';
};

// Global listeners are always attached; handlers guard against inactive drag state
useEventListener(window, 'mousemove', handleGlobalMouseMove);
useEventListener(window, 'mouseup', handleGlobalMouseUp);

// --- Image Manipulation ---

const rotateImage = (deg: number) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Swap dimensions if 90 or 270 degrees
    if (Math.abs(deg) === 90) {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    } else {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    updateImageSource(canvas.toDataURL());
  };
  img.src = currentImageSrc.value;
};

const applyEdits = () => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = crop.w;
    canvas.height = crop.h;

    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

    updateImageSource(canvas.toDataURL());
    closeEditor();
  };
  img.src = currentImageSrc.value;
};

const updateImageSource = (newSrc: string) => {
  currentImageSrc.value = newSrc;

  // Update metadata for the new image
  const i = new Image();
  i.onload = () => {
    imageMeta.naturalWidth = i.naturalWidth;
    imageMeta.naturalHeight = i.naturalHeight;
    settings.width = i.naturalWidth;
    settings.height = i.naturalHeight;

    // If editor is open (e.g. rotation), reset so the imgRenderedWidth watcher re-initializes
    if (isEditorOpen.value) {
      isCropInitialized.value = false;
    }
  };
  i.src = newSrc;
};
</script>

<template>
  <div class="card">
    <div class="container">
      <h2 style="margin-bottom: 16px">Bildbearbeitung</h2>

      <div
        class="upload-area"
        :class="{ dragging: isDraggingFile }"
        @click="triggerUpload"
        @dragover.prevent="isDraggingFile = true"
        @dragleave.prevent="isDraggingFile = false"
        @drop.prevent="handleDrop"
      >
        <p style="margin-top: 0">
          <strong>Klicken zum Hochladen</strong> oder Drag & Drop
        </p>
        <span
          style="font-size: var(--text-sm); color: var(--color-on-ghost-muted)"
          >JPG, PNG, WEBP, AVIF, GIF, BMP</span
        >
        <input
          type="file"
          ref="fileInputRef"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />
      </div>

      <div class="controls" :class="{ active: hasImage }">
        <div class="control-group">
          <BaseLabel for="image-format-select">Ausgabeformat</BaseLabel>
          <BaseSelect
            id="image-format-select"
            v-model="settings.format"
            :options="[
              { label: 'JPEG', value: 'image/jpeg' },
              { label: 'PNG', value: 'image/png' },
              { label: 'WebP', value: 'image/webp' },
            ]"
          />
        </div>
        <div class="control-group">
          <BaseLabel for="image-quality-range"
            >Qualität: {{ settings.quality }} %</BaseLabel
          >
          <input
            id="image-quality-range"
            type="range"
            min="1"
            max="100"
            v-model.number="settings.quality"
          />
        </div>
        <div class="control-group">
          <BaseLabel for="image-width-input">Breite (px)</BaseLabel>
          <BaseInput
            id="image-width-input"
            type="number"
            v-model.number="settings.width"
            :placeholder="imageMeta.naturalWidth.toString()"
          />
        </div>
        <div class="control-group">
          <BaseLabel for="image-height-input">Höhe (px)</BaseLabel>
          <BaseInput
            id="image-height-input"
            type="number"
            v-model.number="settings.height"
            :placeholder="imageMeta.naturalHeight.toString()"
          />
        </div>
      </div>

      <BaseRow justify="end" class="mt-8" v-if="hasImage">
        <BaseButton @click="openEditor" variant="ghost">Bearbeiten</BaseButton>
        <BaseButton @click="convertAndDownload" variant="action"
          >Konvertieren</BaseButton
        >
      </BaseRow>

      <div class="preview-container" v-show="hasImage">
        <div
          style="
            margin-bottom: 8px;
            font-size: var(--text-sm);
            color: var(--color-on-ghost-muted);
          "
        >
          Größe: {{ imageMeta.naturalWidth }} x {{ imageMeta.naturalHeight }}
        </div>
        <img :src="currentImageSrc" alt="Preview" class="preview-img" />
      </div>
    </div>

    <BaseModal v-if="isEditorOpen" @cancel="closeEditor" :submit="applyEdits">
      <template #title>Bildbearbeitung</template>

      <template #content>
        <div class="editor-toolbar">
          <BaseButton
            style="flex: 0; padding: 10px"
            @click="rotateImage(-90)"
            variant="ghost"
            :icon="RotateCcw"
          />
          <BaseButton
            style="flex: 0; padding: 10px"
            @click="rotateImage(90)"
            variant="ghost"
            :icon="RotateCw"
          />

          <div class="editor-input-group">
            <label
              for="editor-crop-x-input"
              style="width: 16px; margin-bottom: 0"
              >X:</label
            >
            <BaseInput
              id="editor-crop-x-input"
              type="number"
              v-model.number="crop.x"
              @input="updateCropFromInput"
            />
          </div>
          <div class="editor-input-group">
            <label
              for="editor-crop-y-input"
              style="width: 16px; margin-bottom: 0"
              >Y:</label
            >
            <BaseInput
              id="editor-crop-y-input"
              type="number"
              v-model.number="crop.y"
              @input="updateCropFromInput"
            />
          </div>
          <div class="editor-input-group">
            <label
              for="editor-crop-w-input"
              style="width: 16px; margin-bottom: 0"
              >W:</label
            >
            <BaseInput
              id="editor-crop-w-input"
              type="number"
              v-model.number="crop.w"
              @input="updateCropFromInput"
            />
          </div>
          <div class="editor-input-group">
            <label
              for="editor-crop-h-input"
              style="width: 16px; margin-bottom: 0"
              >H:</label
            >
            <BaseInput
              id="editor-crop-h-input"
              type="number"
              v-model.number="crop.h"
              @input="updateCropFromInput"
            />
          </div>
        </div>

        <div class="crop-workspace" ref="workspaceRef">
          <img
            ref="editorImageRef"
            :src="currentImageSrc"
            class="editor-image-element"
          />

          <div
            class="crop-box"
            v-show="isCropInitialized"
            :style="cropBoxStyle"
            @mousedown.prevent="startDrag($event, false)"
          >
            <div
              class="resize-handle handle-nw"
              @mousedown.stop.prevent="startDrag($event, 'nw')"
            ></div>
            <div
              class="resize-handle handle-n"
              @mousedown.stop.prevent="startDrag($event, 'n')"
            ></div>
            <div
              class="resize-handle handle-ne"
              @mousedown.stop.prevent="startDrag($event, 'ne')"
            ></div>
            <div
              class="resize-handle handle-e"
              @mousedown.stop.prevent="startDrag($event, 'e')"
            ></div>
            <div
              class="resize-handle handle-se"
              @mousedown.stop.prevent="startDrag($event, 'se')"
            ></div>
            <div
              class="resize-handle handle-s"
              @mousedown.stop.prevent="startDrag($event, 's')"
            ></div>
            <div
              class="resize-handle handle-sw"
              @mousedown.stop.prevent="startDrag($event, 'sw')"
            ></div>
            <div
              class="resize-handle handle-w"
              @mousedown.stop.prevent="startDrag($event, 'w')"
            ></div>
          </div>
        </div>
      </template>

      <template #action-text> Anwenden </template>
    </BaseModal>
  </div>
</template>

<style scoped>
/* Page Wrapper acts as the 'body' from the original HTML */
.page-wrapper {
  display: flex;
  /*justify-content: center;
  align-items: center;
  min-height: 100vh;*/
  margin: 0;
  --overlay: rgba(0, 0, 0, 0.7);
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--color-canvas-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 2rem;
}
.upload-area:hover,
.upload-area.dragging {
  border-color: var(--color-surface-border);
}

/* Controls Grid */
.controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  opacity: 0.5;
  pointer-events: none;
}
.controls.active {
  opacity: 1;
  pointer-events: auto;
}

.control-group {
  display: flex;
  flex-direction: column;
}

label {
  font-size: var(--text-sm);
  margin-bottom: 6px;
}

.hidden {
  display: none;
}

/* Preview Area */
.preview-container {
  margin-top: 1rem;
  text-align: center;
}
.preview-img {
  max-width: 100%;
  border-radius: var(--radius-md);
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.editor-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
}

/* Canvas Container for Cropping */
.crop-workspace {
  flex: 1;
  position: relative;
  background: var(--color-canvas);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

.editor-image-element {
  max-width: 100%;
  max-height: 100%;
  display: block;
  pointer-events: none; /* Let clicks pass to crop box */
}

/* The Visual Crop Box */
.crop-box {
  position: absolute;
  border: 2px solid var(--color-on-ghost-muted);
  box-shadow: 0 0 0 9999px
    color-mix(in oklab, var(--color-canvas), transparent 40%); /* Dimming effect */
  cursor: move;
}

/* Resize Handle */
.resize-handle {
  width: 8px;
  height: 8px;
  background: var(--color-action);
  position: absolute;
  z-index: 10;
}

.handle-nw {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}
.handle-n {
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}
.handle-ne {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}

.handle-e {
  top: 50%;
  right: -5px;
  transform: translateY(-50%);
  cursor: e-resize;
}
.handle-w {
  top: 50%;
  left: -5px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.handle-se {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}
.handle-s {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}
.handle-sw {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}

@media (max-width: 500px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
</style>
