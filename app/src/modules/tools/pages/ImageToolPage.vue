<script setup lang="ts">
import { RotateCw, RotateCcw } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { ref, reactive, computed, watch } from 'vue';
import { useElementBounding, useEventListener } from '@vueuse/core';

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

const { t } = useI18n();
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

const isEditorOpen = ref(false);
const isCropInitialized = ref(false);
const crop = reactive<CropState>({ x: 0, y: 0, w: 0, h: 0 });

const {
  width: imgRenderedWidth,
  left: imgLeft,
  top: imgTop,
} = useElementBounding(editorImageRef);
const { left: workspaceLeft, top: workspaceTop } =
  useElementBounding(workspaceRef);

const editorScale = computed(() =>
  imageMeta.naturalWidth > 0 && imgRenderedWidth.value > 0
    ? imgRenderedWidth.value / imageMeta.naturalWidth
    : 1,
);

let isDragging = false;
let resizeDir = '';
let startMouseX = 0;
let startMouseY = 0;
let boxStart = { x: 0, y: 0, w: 0, h: 0 };

const handleDirs = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

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
    const img = new Image();
    img.onload = () => {
      currentImageSrc.value = result;
      imageMeta.naturalWidth = img.naturalWidth;
      imageMeta.naturalHeight = img.naturalHeight;

      settings.width = img.naturalWidth;
      settings.height = img.naturalHeight;
    };
    img.src = result;
  };
  reader.readAsDataURL(file);
};

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

const updateCropFromInput = () => {
  setCrop(crop.x, crop.y, crop.w, crop.h);
};

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

  boxStart = { ...crop };
};

const handleGlobalMouseMove = (e: MouseEvent) => {
  if (!isDragging && !resizeDir) return;

  const dx = (e.clientX - startMouseX) / editorScale.value;
  const dy = (e.clientY - startMouseY) / editorScale.value;

  if (isDragging) {
    setCrop(boxStart.x + dx, boxStart.y + dy, boxStart.w, boxStart.h);
  } else if (resizeDir) {
    let newX = boxStart.x;
    let newY = boxStart.y;
    let newW = boxStart.w;
    let newH = boxStart.h;

    if (resizeDir.includes('n')) {
      newY = boxStart.y + dy;
      newH = boxStart.h - dy;
    }
    if (resizeDir.includes('s')) {
      newH = boxStart.h + dy;
    }
    if (resizeDir.includes('w')) {
      newX = boxStart.x + dx;
      newW = boxStart.w - dx;
    }
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

useEventListener(window, 'mousemove', handleGlobalMouseMove);
useEventListener(window, 'mouseup', handleGlobalMouseUp);

const rotateImage = (deg: number) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

  const i = new Image();
  i.onload = () => {
    imageMeta.naturalWidth = i.naturalWidth;
    imageMeta.naturalHeight = i.naturalHeight;
    settings.width = i.naturalWidth;
    settings.height = i.naturalHeight;

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
      <h2 class="mb-4 animate-[fade-up_0.5s_ease-out]">{{ t('tools.image.title') }}</h2>

      <div
        class="border-2 border-dashed border-canvas-border rounded-md p-4 text-center cursor-pointer transition-all duration-200 mb-8 animate-[fade-up_0.5s_ease-out_both] delay-[0.05s]"
        :class="{ 'border-surface-border': isDraggingFile }"
        @click="triggerUpload"
        @dragover.prevent="isDraggingFile = true"
        @dragleave.prevent="isDraggingFile = false"
        @drop.prevent="handleDrop"
      >
        <p class="mt-0">
          <strong>{{ t('tools.image.upload_click') }}</strong> {{ t('tools.image.upload_drag') }}
        </p>
        <span class="text-sm text-on-ghost-muted"
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

      <div
        class="grid grid-cols-2 gap-4 opacity-50 pointer-events-none animate-[fade-up_0.5s_ease-out_both] delay-[0.1s]"
        :class="{ '!opacity-100 !pointer-events-auto': hasImage }"
      >
        <div class="flex flex-col">
          <BaseLabel for="image-format-select">{{ t('tools.image.settings.format') }}</BaseLabel>
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
        <div class="flex flex-col">
          <BaseLabel for="image-quality-range">{{ t('tools.image.settings.quality', { quality: settings.quality }) }}</BaseLabel>
          <input
            id="image-quality-range"
            type="range"
            min="1"
            max="100"
            v-model.number="settings.quality"
          />
        </div>
        <div class="flex flex-col">
          <BaseLabel for="image-width-input">{{ t('tools.image.settings.width') }}</BaseLabel>
          <BaseInput
            id="image-width-input"
            type="number"
            v-model.number="settings.width"
            :placeholder="imageMeta.naturalWidth.toString()"
          />
        </div>
        <div class="flex flex-col">
          <BaseLabel for="image-height-input">{{ t('tools.image.settings.height') }}</BaseLabel>
          <BaseInput
            id="image-height-input"
            type="number"
            v-model.number="settings.height"
            :placeholder="imageMeta.naturalHeight.toString()"
          />
        </div>
      </div>

      <BaseRow
        justify="end"
        class="mt-8 animate-[fade-up_0.5s_ease-out_both] delay-[0.15s]"
        v-if="hasImage"
      >
        <BaseButton @click="openEditor" variant="ghost">{{ t('common.buttons.edit') }}</BaseButton>
        <BaseButton @click="convertAndDownload" variant="action">{{ t('tools.image.actions.convert') }}</BaseButton>
      </BaseRow>

      <div
        class="mt-4 text-center animate-[fade-up_0.5s_ease-out_both] delay-[0.2s]"
        v-show="hasImage"
      >
        <div class="mb-2 text-sm text-on-ghost-muted">
          {{ t('tools.image.settings.size') }}: {{ imageMeta.naturalWidth }} x {{ imageMeta.naturalHeight }}
        </div>
        <img
          :src="currentImageSrc"
          alt="Preview"
          class="max-w-full rounded-xl"
        />
      </div>
    </div>

    <BaseModal :open="isEditorOpen" @cancel="closeEditor" :submit="applyEdits">
      <template #title>{{ t('tools.image.title') }}</template>

      <template #content>
        <div class="flex gap-2 mb-4 flex-wrap">
          <BaseTooltip content="Rotate left" placement="top">
            <BaseButton
              class="flex-[0] p-[10px]"
              @click="rotateImage(-90)"
              variant="ghost"
              :icon="RotateCcw"
            />
          </BaseTooltip>
          <BaseTooltip content="Rotate right" placement="top">
            <BaseButton
              class="flex-[0] p-[10px]"
              @click="rotateImage(90)"
              variant="ghost"
              :icon="RotateCw"
            />
          </BaseTooltip>

          <BaseFormGroup id="editor-crop-x-input">
            <BaseLabel for="editor-crop-x-input">X:</BaseLabel>
            <BaseInput
              id="editor-crop-x-input"
              type="number"
              v-model.number="crop.x"
              @input="updateCropFromInput"
            />
          </BaseFormGroup>
          <BaseFormGroup id="editor-crop-y-input">
            <BaseLabel for="editor-crop-y-input">Y:</BaseLabel>
            <BaseInput
              id="editor-crop-y-input"
              type="number"
              v-model.number="crop.y"
              @input="updateCropFromInput"
            />
          </BaseFormGroup>
          <BaseFormGroup id="editor-crop-w-input">
            <BaseLabel for="editor-crop-w-input">W:</BaseLabel>
            <BaseInput
              id="editor-crop-w-input"
              type="number"
              v-model.number="crop.w"
              @input="updateCropFromInput"
            />
          </BaseFormGroup>
          <BaseFormGroup id="editor-crop-h-input">
            <BaseLabel for="editor-crop-h-input">H:</BaseLabel>
            <BaseInput
              id="editor-crop-h-input"
              type="number"
              v-model.number="crop.h"
              @input="updateCropFromInput"
            />
          </BaseFormGroup>
        </div>

        <div
          class="flex-1 relative bg-canvas overflow-hidden flex justify-center items-center mb-4"
          ref="workspaceRef"
        >
          <img
            ref="editorImageRef"
            :src="currentImageSrc"
            class="max-w-full max-h-full block pointer-events-none"
          />

          <div
            class="absolute border-2 border-on-ghost-muted shadow-[0_0_0_9999px_color-mix(in_oklab,var(--color-canvas),transparent_40%)] cursor-move"
            v-show="isCropInitialized"
            :style="cropBoxStyle"
            @mousedown.prevent="startDrag($event, false)"
          >
            <div
              v-for="dir in handleDirs"
              :key="dir"
              class="size-3 bg-action rounded-full absolute z-10"
              :class="[
                `cursor-${dir}-resize`,
                dir.includes('n')
                  ? '-top-[7px]'
                  : dir.includes('s')
                    ? '-bottom-[7px]'
                    : 'top-1/2 -translate-y-1/2',
                dir.includes('w')
                  ? '-left-[7px]'
                  : dir.includes('e')
                    ? '-right-[7px]'
                    : 'left-1/2 -translate-x-1/2',
              ]"
              @mousedown.stop.prevent="startDrag($event, dir)"
            ></div>
          </div>
        </div>
      </template>

      <template #action-text> {{ t('tools.image.actions.apply') }} </template>
    </BaseModal>
  </div>
</template>
