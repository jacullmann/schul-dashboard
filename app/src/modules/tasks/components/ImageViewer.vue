<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { X, ChevronLeft, ChevronRight, FileText } from '@lucide/vue';
import { makeUrl, makeRawUrl } from '@/modules/tasks/composables/useImageUpload';

const props = defineProps<{
  visible: boolean;
  images: Array<{ publicId?: string; url?: string; metadata?: Record<string, unknown>; [key: string]: unknown }>;
  initialIndex: number;
}>();

const emit = defineEmits(['cancel']);

const currentIndex = ref(props.initialIndex);
const controlsVisible = ref(true);
const overlayRef = ref<HTMLElement | null>(null);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
    () => props.visible,
    (val) => {
      if (val) {
        currentIndex.value = props.initialIndex;
        showControls();
        nextTick(() => overlayRef.value?.focus());
      }
    },
);

const currentImage = computed(() => props.images[currentIndex.value]);
const hasNext = computed(() => currentIndex.value < props.images.length - 1);
const hasPrev = computed(() => currentIndex.value > 0);

const isPdf = (img: any) =>
    img?.metadata?.format === 'pdf' ||
    img?.publicId?.toLowerCase().endsWith('.pdf');

const isOffice = (img: any) => {
  const format = img?.metadata?.format?.toLowerCase();
  return ['docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls'].includes(format);
};

const isLocalUrl = (url: string) => {
  return url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('/') || !url.startsWith('http');
};

function getImageSrc(img: any): string {
  if (!img) return '';
  if (isOffice(img)) {
    return img.url || makeRawUrl(img.publicId);
  }
  return img.url || makeUrl(img.publicId);
}

function getOfficeViewerSrc(img: any): string {
  const fileUrl = getImageSrc(img);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function next() {
  if (hasNext.value) {
    currentIndex.value++;
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

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') cancel();
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
}

function showControls() {
  controlsVisible.value = true;
  if (hideTimeout) clearTimeout(hideTimeout);

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
        <iframe
            v-if="currentImage && isOffice(currentImage) && !isLocalUrl(getImageSrc(currentImage))"
            :src="getOfficeViewerSrc(currentImage)"
            class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white shadow-menu"
            @click.stop
        ></iframe>
        <div
            v-else-if="currentImage && isOffice(currentImage) && isLocalUrl(getImageSrc(currentImage))"
            class="w-[90vw] h-[85vh] max-w-5xl rounded-xl bg-slate-900 border border-white/10 text-white flex flex-col items-center justify-center p-8 text-center shadow-menu"
            @click.stop
        >
          <div class="p-4 bg-white/5 rounded-full mb-4 border border-white/10">
            <FileText :size="48" class="text-blue-400 animate-pulse" />
          </div>
          <h3 class="text-xl font-semibold mb-2">Simulierter Office Web Viewer</h3>
          <p class="text-slate-400 max-w-md text-sm mb-6">
            Da lokale URLs (<code class="text-blue-300 font-mono text-xs bg-black/40 px-1.5 py-0.5 rounded">{{ getImageSrc(currentImage) }}</code>) von Microsofts Servern nicht abgerufen werden können, wird der Office-Viewer hier im Entwicklungsmodus simuliert.
          </p>
          <div class="flex gap-4">
            <a
              :href="getImageSrc(currentImage)"
              target="_blank"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 decoration-none select-none cursor-pointer"
            >
              <span>Datei herunterladen</span>
            </a>
          </div>
        </div>
        <iframe
            v-else-if="currentImage && isPdf(currentImage)"
            :src="getImageSrc(currentImage)"
            class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white shadow-menu"
            @click.stop
        ></iframe>
        <img
            v-else-if="currentImage"
            :src="getImageSrc(currentImage)"
            class="max-w-full max-h-full rounded-xl object-contain shadow-menu transition-transform duration-200 ease-out"
            draggable="false"
            @click.stop
            alt=""
        />
      </div>

      <Transition name="fade-controls">
        <div v-show="controlsVisible" class="fixed inset-0 pointer-events-none">
          <button
              v-wave
              class="absolute top-4 right-4 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
              @click.stop="cancel"
          >
            <X />
          </button>

          <button
              v-if="hasPrev"
              v-wave
              class="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
              @click.stop="prev"
          >
            <ChevronLeft />
          </button>

          <button
              v-if="hasNext"
              v-wave
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
