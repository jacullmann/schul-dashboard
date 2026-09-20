<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { X, ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  makeUrl,
  makeRawUrl,
  makeThumb,
} from '@/modules/tasks/composables/useImageUpload';

const props = defineProps<{
  visible: boolean;
  images: Array<{
    publicId?: string;
    url?: string;
    thumbUrl?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  initialIndex: number;
  // Resolves the grid tile an image was opened from, so the viewer can grow
  // out of it and shrink back into it.
  origin?: ((index: number) => HTMLElement | null) | null;
}>();

const emit = defineEmits(['cancel']);

const currentIndex = ref(props.initialIndex);
const controlsVisible = ref(true);
const overlayRef = ref<any>(null);
const fullLoaded = ref(false);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let zooming = false;
let pendingSize: { w: number; h: number } | null = null;

const { width: windowWidth, height: windowHeight } = useWindowSize();

// Opening decelerates into the full frame. Closing keeps its speed to the end
// instead of creeping the last few pixels, where any difference between the
// thumbnail and the image would be on show.
const OPEN_DURATION = 420;
const OPEN_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const CLOSE_DURATION = 300;
const CLOSE_EASING = 'cubic-bezier(0.3, 0.55, 0.7, 0.8)';
const FADE_DURATION = 300;
// Where the thumbnail hands over to the image, in animation progress. Early,
// because the thumbnail only stands for the same picture at the tile end: the
// swap happens while the frame still moves fast and hides it.
const HANDOVER = 0.28;
// The grid tiles are rounded-md, the viewer frame is rounded-xl.
const THUMB_RADIUS = 8;
const FRAME_RADIUS = 16;
// BaseBackdrop defaults: bg-black/40 with backdrop-blur-md.
const DIM_FROM = 'rgba(0, 0, 0, 0)';
const DIM_TO = 'rgba(0, 0, 0, 0.4)';
const BLUR_FROM = 'blur(0px)';
const BLUR_TO = 'blur(12px)';
// The backdrop padding, which bounds the image box.
const VIEWPORT_PADDING = 16;
// Steps used to sample the counter scale of the image inside the frame.
const ZOOM_SAMPLES = 24;

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

// The thumbnail is already in the browser cache, so it stands in for the full
// image while that one loads and the zoom runs.
const thumbSrc = computed(() => {
  const img = currentImage.value as any;
  if (!img) return '';
  return img.thumbUrl || makeThumb(img.metadata?.thumbnailId || img.publicId);
});

// Only a known aspect ratio lets the final frame be laid out before the full
// image arrives, which is what the zoom animates towards. The stored metadata
// can disagree with what the image really is, for example when it was rotated
// on delivery, so the loaded image corrects it.
const measuredSize = ref<{ w: number; h: number } | null>(null);

const naturalSize = computed(() => {
  if (measuredSize.value) return measuredSize.value;

  const metadata = currentImage.value?.metadata as any;
  const w = Number(metadata?.width);
  const h = Number(metadata?.height);
  return w > 0 && h > 0 ? { w, h } : null;
});

const frameSize = computed(() => {
  const natural = naturalSize.value;
  if (!natural) return null;

  const availableW = Math.max(0, windowWidth.value - VIEWPORT_PADDING * 2);
  const availableH = Math.max(0, windowHeight.value - VIEWPORT_PADDING * 2);
  // Matches max-w-full/max-h-full: contain, never upscaled.
  const scale = Math.min(availableW / natural.w, availableH / natural.h, 1);

  return { w: natural.w * scale, h: natural.h * scale };
});

const frameStyle = computed(() =>
  frameSize.value
    ? { width: `${frameSize.value.w}px`, height: `${frameSize.value.h}px` }
    : undefined,
);

function focusOverlay() {
  (overlayRef.value?.$el as HTMLElement | undefined)?.focus?.();
}

function next() {
  if (hasNext.value) {
    currentIndex.value++;
    void nextTick(() => focusOverlay());
  }
}

function prev() {
  if (hasPrev.value) {
    currentIndex.value--;
    void nextTick(() => focusOverlay());
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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The tile to grow out of, or null when there is nothing sensible to grow
// from: no origin, a missing tile, or one scrolled out of the viewport.
function originTile(): HTMLElement | null {
  if (prefersReducedMotion() || !frameSize.value) return null;

  const el = props.origin?.(currentIndex.value) ?? null;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return null;

  return el;
}

// The tile sits right under the frame for the whole animation, so a hidden
// tile keeps its edge from peeking out along the way.
function hideTile(tile: HTMLElement) {
  tile.style.visibility = 'hidden';
  return () => {
    tile.style.visibility = '';
  };
}

// The frame is squashed onto the tile, so the image inside it is counter
// scaled back to a uniform ratio. That keeps the picture undistorted while the
// frame crops it exactly like the tile does.
function zoomKeyframes(tile: DOMRect, frame: DOMRect) {
  const sx = tile.width / frame.width;
  const sy = tile.height / frame.height;
  const dx = tile.left + tile.width / 2 - (frame.left + frame.width / 2);
  const dy = tile.top + tile.height / 2 - (frame.top + frame.height / 2);
  const cover = Math.max(sx, sy);

  return {
    frame: [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        borderRadius: `${THUMB_RADIUS / sx}px / ${THUMB_RADIUS / sy}px`,
      },
      {
        transform: 'translate(0px, 0px) scale(1, 1)',
        borderRadius: `${FRAME_RADIUS}px`,
      },
    ],
    // The frame interpolates its two axes on its own, so the counter scale has
    // to be sampled along that same path. A single pair of keyframes only
    // lines up at the two ends and squashes the picture in between.
    inner: Array.from({ length: ZOOM_SAMPLES + 1 }, (_, step) => {
      const progress = step / ZOOM_SAMPLES;
      const frameX = sx + (1 - sx) * progress;
      const frameY = sy + (1 - sy) * progress;
      const uniform = cover + (1 - cover) * progress;

      return {
        offset: progress,
        transform: `scale(${uniform / frameX}, ${uniform / frameY})`,
      };
    }),
    // The thumbnail covers the frame, so at the tile end it is the tile,
    // pixel for pixel. It hands over to the image mid-flight.
    thumb: [
      { offset: 0, opacity: 1 },
      { offset: HANDOVER, opacity: 0 },
      { offset: 1, opacity: 0 },
    ],
  };
}

// Plays a keyframe list backwards, offsets included, for the close animation.
function reversed(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes]
    .reverse()
    .map((keyframe) =>
      typeof keyframe.offset === 'number'
        ? { ...keyframe, offset: 1 - keyframe.offset }
        : keyframe,
    );
}

function dimKeyframes(): Keyframe[] {
  return [
    {
      backgroundColor: DIM_FROM,
      backdropFilter: BLUR_FROM,
      webkitBackdropFilter: BLUR_FROM,
    },
    {
      backgroundColor: DIM_TO,
      backdropFilter: BLUR_TO,
      webkitBackdropFilter: BLUR_TO,
    },
  ];
}

// Read from the DOM rather than through template refs: Vue clears the refs as
// soon as the viewer unmounts, while the element itself stays around for the
// close animation.
function zoomParts(backdrop: HTMLElement) {
  const frame = backdrop.querySelector<HTMLElement>('[data-viewer-frame]');
  const inner = backdrop.querySelector<HTMLElement>('[data-viewer-inner]');
  const thumb = backdrop.querySelector<HTMLElement>('[data-viewer-thumb]');
  return frame && inner ? { frame, inner, thumb } : null;
}

function settle(animations: Animation[], done: () => void) {
  Promise.all(animations.map((animation) => animation.finished))
    .catch(() => undefined)
    .finally(done);
}

async function onEnter(el: Element, done: () => void) {
  const backdrop = el as HTMLElement;

  await nextTick();

  const parts = zoomParts(backdrop);
  const tile = parts ? originTile() : null;

  if (!tile || !parts) {
    showControls();
    settle(
      [
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: FADE_DURATION,
          easing: 'ease',
        }),
      ],
      done,
    );
    return;
  }

  const options: KeyframeAnimationOptions = {
    duration: OPEN_DURATION,
    easing: OPEN_EASING,
  };
  const keyframes = zoomKeyframes(
    tile.getBoundingClientRect(),
    parts.frame.getBoundingClientRect(),
  );
  const animations = [
    backdrop.animate(dimKeyframes(), options),
    parts.frame.animate(keyframes.frame, options),
    parts.inner.animate(keyframes.inner, options),
  ];

  // Without the image there is nothing to hand over to yet, so the thumbnail
  // stays up and its own fade takes over once the image arrives.
  if (parts.thumb && fullLoaded.value) {
    animations.push(parts.thumb.animate(keyframes.thumb, options));
  }

  const showTile = hideTile(tile);
  zooming = true;

  settle(animations, () => {
    zooming = false;
    if (pendingSize) {
      measuredSize.value = pendingSize;
      pendingSize = null;
    }
    showTile();
    showControls();
    done();
  });
}

function onLeave(el: Element, done: () => void) {
  const backdrop = el as HTMLElement;
  const parts = zoomParts(backdrop);
  const tile = parts ? originTile() : null;

  controlsVisible.value = false;

  if (!tile || !parts) {
    settle(
      [
        backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: FADE_DURATION,
          easing: 'ease',
        }),
      ],
      done,
    );
    return;
  }

  // Held at the end state, otherwise the frame snaps back to full size for the
  // frame or two between the animation finishing and the unmount.
  const options: KeyframeAnimationOptions = {
    duration: CLOSE_DURATION,
    easing: CLOSE_EASING,
    fill: 'forwards',
  };
  const keyframes = zoomKeyframes(
    tile.getBoundingClientRect(),
    parts.frame.getBoundingClientRect(),
  );
  const animations = [
    backdrop.animate(reversed(dimKeyframes()), options),
    parts.frame.animate(reversed(keyframes.frame), options),
    parts.inner.animate(reversed(keyframes.inner), options),
  ];

  // Back to the thumbnail before the frame reaches the tile, so what lands is
  // the tile itself rather than an image that has to match it.
  if (parts.thumb && fullLoaded.value) {
    animations.push(parts.thumb.animate(reversed(keyframes.thumb), options));
  }

  const showTile = hideTile(tile);

  settle(animations, () => {
    showTile();
    done();
  });
}

function onFullLoad(event: Event) {
  const img = event.target as HTMLImageElement;
  fullLoaded.value = true;

  if (!img.naturalWidth || !img.naturalHeight) return;

  const natural = naturalSize.value;
  const loaded = { w: img.naturalWidth, h: img.naturalHeight };
  const matches =
    natural && Math.abs(natural.w / natural.h - loaded.w / loaded.h) < 0.01;

  if (matches) return;

  // The frame is the wrong shape for this image, so the picture would sit in
  // it with a margin that the tile does not have. Resize it, but not while the
  // zoom is running off the rect it started with.
  if (zooming) {
    pendingSize = loaded;
  } else {
    measuredSize.value = loaded;
  }
}

watch(currentIndex, () => {
  fullLoaded.value = false;
  measuredSize.value = null;
  pendingSize = null;
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentIndex.value = props.initialIndex;
      fullLoaded.value = false;
      measuredSize.value = null;
      pendingSize = null;
      // The controls belong to the full frame, so they arrive with it. Hiding
      // them before the first render keeps them from flashing on open.
      controlsVisible.value = false;
      document.body.style.overflow = 'hidden';
      void nextTick(() => focusOverlay());
    } else {
      document.body.style.overflow = '';
    }
  },
);

onBeforeUnmount(() => {
  if (hideTimeout) clearTimeout(hideTimeout);
});
</script>

<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <BaseBackdrop
      v-if="visible"
      ref="overlayRef"
      class="z-[100002] p-4"
      tabindex="0"
      @mousemove="onActivity"
      @cancel="cancel"
      @touchstart="onActivity"
      @keydown="handleKeydown"
    >
      <div
        class="w-full h-full flex items-center justify-center"
        @click.self="cancel"
      >
        <iframe
          v-if="currentImage && isOffice(currentImage)"
          :src="getOfficeViewerSrc(currentImage)"
          class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white shadow-menu"
          @click.stop
        ></iframe>
        <iframe
          v-else-if="currentImage && isPdf(currentImage)"
          :src="getImageSrc(currentImage)"
          class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white shadow-menu"
          @click.stop
        ></iframe>
        <div
          v-else-if="currentImage && frameSize"
          data-viewer-frame
          class="relative max-w-full max-h-full overflow-hidden rounded-xl shadow-menu will-change-transform"
          :style="frameStyle"
          @click.stop
        >
          <div data-viewer-inner class="absolute inset-0 will-change-transform">
            <img
              :src="getImageSrc(currentImage)"
              class="absolute inset-0 w-full h-full object-contain"
              draggable="false"
              alt=""
              @load="onFullLoad"
            />
          </div>

          <!-- Sits on top of the image and outside the counter scaled layer.
               object-fill, because the frame is squashed onto the tile at that
               end of the zoom and the two stretches cancel out: the square
               thumbnail then lands on the tile exactly as the tile draws it.
               That is what makes the handover invisible. -->
          <img
            v-if="thumbSrc"
            :src="thumbSrc"
            data-viewer-thumb
            class="absolute inset-0 w-full h-full object-fill transition-opacity duration-200 ease-out"
            :class="fullLoaded ? 'opacity-0' : 'opacity-100'"
            draggable="false"
            aria-hidden="true"
            alt=""
          />
        </div>
        <img
          v-else-if="currentImage"
          :src="getImageSrc(currentImage)"
          class="max-w-full max-h-full rounded-xl object-contain shadow-menu"
          draggable="false"
          alt=""
          @click.stop
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
