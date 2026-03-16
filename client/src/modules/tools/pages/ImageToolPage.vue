<script setup lang="ts">
import { RotateCw, RotateCcw } from 'lucide-vue-next';
import { ref, reactive, computed, nextTick, onUnmounted } from 'vue';

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
const editorScale = ref(1); // Ratio of Visual Size : Natural Size

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
  if (input.files?.length) loadFile(input.files[0]);
};

const handleDrop = (e: DragEvent) => {
  isDraggingFile.value = false;
  if (e.dataTransfer?.files.length) loadFile(e.dataTransfer.files[0]);
};

const loadFile = (file: File) => {
  if (!file.type.startsWith('image/')) return alert("Not an image");

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
      alert("Error converting file.");
    }
  };
  img.src = currentImageSrc.value;
};

// --- Editor Logic ---

const openEditor = async () => {
  isEditorOpen.value = true;
  // Wait for modal to render so we can calculate image position/size
  await nextTick();
  // Small delay to ensure image layout is stable
  setTimeout(initCropTool, 100);
};

const closeEditor = () => {
  isEditorOpen.value = false;
  isCropInitialized.value = false;
};

const initCropTool = () => {
  if (!editorImageRef.value) return;

  const imgEl = editorImageRef.value;
  const rect = imgEl.getBoundingClientRect();

  // Calculate Scale: How many pixels on screen = 1 pixel in natural image
  editorScale.value = rect.width / imageMeta.naturalWidth;

  // Initialize Box at 50% size, centered
  const initW = imageMeta.naturalWidth * 0.5;
  const initH = imageMeta.naturalHeight * 0.5;
  const initX = (imageMeta.naturalWidth - initW) / 2;
  const initY = (imageMeta.naturalHeight - initH) / 2;

  setCrop(initX, initY, initW, initH);
  isCropInitialized.value = true;
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

// Computed style for the visual box
const cropBoxStyle = computed(() => {
  if (!editorImageRef.value) return {};

  // Convert Natural Coordinates -> CSS Pixels
  const left = (crop.x * editorScale.value) + editorImageRef.value.offsetLeft;
  const top = (crop.y * editorScale.value) + editorImageRef.value.offsetTop;
  const width = crop.w * editorScale.value;
  const height = crop.h * editorScale.value;

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
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

  // Add global listeners
  window.addEventListener('mousemove', handleGlobalMouseMove);
  window.addEventListener('mouseup', handleGlobalMouseUp);
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
  resizeDir = ''; // Reset direction
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
};

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
    ctx.rotate(deg * Math.PI / 180);
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

    // If editor is open (e.g. rotation), re-init crop tool
    if (isEditorOpen.value) {
      setTimeout(initCropTool, 50);
    }
  };
  i.src = newSrc;
};

// Cleanup
onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});
</script>

<template>
  <div class="card">
    <div class="container">
      <h2 style="margin-bottom: 16px;">Bildbearbeitung</h2>

      <div
          class="upload-area"
          :class="{ 'dragging': isDraggingFile }"
          @click="triggerUpload"
          @dragover.prevent="isDraggingFile = true"
          @dragleave.prevent="isDraggingFile = false"
          @drop.prevent="handleDrop"
      >
        <p style="margin-top: 0;"><strong>Klicken zum Hochladen</strong> oder Drag & Drop</p>
        <span style="font-size: var(--font-size-sub); color: var(--sub);">JPG, PNG, WEBP, AVIF, GIF, BMP</span>
        <input
            type="file"
            ref="fileInputRef"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
        >
      </div>

      <div class="controls" :class="{ active: hasImage }">
        <div class="control-group">
          <label>Ausgabeformat</label>
          <select class="btn ghost" v-model="settings.format">
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>
        <div class="control-group">
          <label>Qualität: {{ settings.quality }} %</label>
          <input
              type="range"
              min="1"
              max="100"
              v-model.number="settings.quality"
          >
        </div>
        <div class="control-group">
          <label>Breite (px)</label>
          <input
              type="number"
              class="input"
              v-model.number="settings.width"
              :placeholder="imageMeta.naturalWidth.toString()"
          >
        </div>
        <div class="control-group">
          <label>Höhe (px)</label>
          <input
              type="number"
              class="input"
              v-model.number="settings.height"
              :placeholder="imageMeta.naturalHeight.toString()"
          >
        </div>
      </div>

      <div class="row button-group" v-if="hasImage">
        <button @click="openEditor" class="btn ghost">Bearbeiten</button>
        <button @click="convertAndDownload" class="btn action">Konvertieren</button>
      </div>

      <div class="preview-container" v-show="hasImage">
        <div style="margin-bottom: 8px; font-size: var(--font-size-sub); color: var(--sub);">
          Größe: {{ imageMeta.naturalWidth }} x {{ imageMeta.naturalHeight }}
        </div>
        <img :src="currentImageSrc" alt="Preview" class="preview-img">
      </div>
    </div>

    <div class="blurit" :class="{ open: isEditorOpen }">
      <div class="editor-card">
        <div class="editor-toolbar">
          <button class="btn ghost" style="flex: 0; padding: 10px;" @click="rotateImage(-90)">
            <RotateCcw :size="16"/>
          </button>
          <button class="btn ghost" style="flex: 0; padding: 10px;" @click="rotateImage(90)">
            <RotateCw :size="16"/>
          </button>

          <div class="editor-input-group">
            <span style="width: 16px;">X:</span> <input type="number" class="input" v-model.number="crop.x" @input="updateCropFromInput">
          </div>
          <div class="editor-input-group">
            <span style="width: 16px;">Y:</span> <input type="number" class="input" v-model.number="crop.y" @input="updateCropFromInput">
          </div>
          <div class="editor-input-group">
            <span style="width: 16px;">W:</span> <input type="number" class="input" v-model.number="crop.w" @input="updateCropFromInput">
          </div>
          <div class="editor-input-group">
            <span style="width: 16px;">H:</span> <input type="number" class="input" v-model.number="crop.h" @input="updateCropFromInput">
          </div>
        </div>

        <div class="crop-workspace" ref="workspaceRef">
          <img ref="editorImageRef" :src="currentImageSrc" class="editor-image-element">

          <div
              class="crop-box"
              v-show="isCropInitialized"
              :style="cropBoxStyle"
              @mousedown.prevent="startDrag($event, false)"
          >
            <div class="resize-handle handle-nw" @mousedown.stop.prevent="startDrag($event, 'nw')"></div>
            <div class="resize-handle handle-n"  @mousedown.stop.prevent="startDrag($event, 'n')"></div>
            <div class="resize-handle handle-ne" @mousedown.stop.prevent="startDrag($event, 'ne')"></div>
            <div class="resize-handle handle-e"  @mousedown.stop.prevent="startDrag($event, 'e')"></div>
            <div class="resize-handle handle-se" @mousedown.stop.prevent="startDrag($event, 'se')"></div>
            <div class="resize-handle handle-s"  @mousedown.stop.prevent="startDrag($event, 's')"></div>
            <div class="resize-handle handle-sw" @mousedown.stop.prevent="startDrag($event, 'sw')"></div>
            <div class="resize-handle handle-w"  @mousedown.stop.prevent="startDrag($event, 'w')"></div>
          </div>
        </div>

        <div class="row">
          <button class="btn ghost" @click="closeEditor">Abbrechen</button>
          <button class="btn action" @click="applyEdits">Anwenden</button>
        </div>
      </div>
    </div>
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
  border: 2px dashed var(--border-canvas);
  border-radius: var(--border-radius-md);
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 2rem;
}
.upload-area:hover, .upload-area.dragging {
  border-color: var(--border-surface);
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
  font-size: var(--font-size-sub);
  margin-bottom: 6px;
}

.button-group {
  margin-top: 2rem;
}

.hidden { display: none; }

/* Preview Area */
.preview-container {
  margin-top: 1rem;
  text-align: center;
}
.preview-img {
  max-width: 100%;
  border-radius: var(--border-radius-md);
}

/* --- EDITOR MODAL STYLES --- */
.blurit {
  display: none;
}
.blurit.open {
  display: flex;
}

.editor-card {
  background: var(--bg-canvas);
  border: 1px solid var(--border-canvas);
  padding: 16px;
  border-radius: var(--border-radius-xl);
  width: 90%;
  max-width: 900px;
  max-height: calc(100vh - 40px);
  overflow: scroll;
  display: flex;
  flex-direction: column;
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
  font-size: var(--font-size-sub);
}

/* Canvas Container for Cropping */
.crop-workspace {
  flex: 1;
  position: relative;
  background: var(--bg-canvas);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

.editor-image-element {
  max-width: 100%; max-height: 100%;
  display: block;
  pointer-events: none; /* Let clicks pass to crop box */
}

/* The Visual Crop Box */
.crop-box {
  position: absolute;
  border: 2px solid var(--sub);
  box-shadow: 0 0 0 9999px color-mix(in oklab, var(--bg-canvas), transparent 40%); /* Dimming effect */
  cursor: move;
}

/* Resize Handle */
.resize-handle {
  width: 8px;
  height: 8px;
  background: var(--text-default);
  position: absolute;
  z-index: 10;
}

.handle-nw { top: -5px; left: -5px; cursor: nw-resize; }
.handle-n  { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
.handle-ne { top: -5px; right: -5px; cursor: ne-resize; }

.handle-e  { top: 50%; right: -5px; transform: translateY(-50%); cursor: e-resize; }
.handle-w  { top: 50%; left: -5px; transform: translateY(-50%); cursor: w-resize; }

.handle-se { bottom: -5px; right: -5px; cursor: se-resize; }
.handle-s  { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.handle-sw { bottom: -5px; left: -5px; cursor: sw-resize; }

@media (max-width: 500px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
</style>