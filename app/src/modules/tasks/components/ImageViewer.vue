<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { X, Ellipsis, ChevronLeft, ChevronRight } from '@lucide/vue';
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
  // Opens the context menu of the image on show. The viewer only knows the
  // image, so the page that owns it says what the menu does with it. Without
  // this there is no menu button.
  menu?: ((event: MouseEvent, index: number) => void) | null;
}>();

const emit = defineEmits(['cancel']);

const currentIndex = ref(props.initialIndex);
const controlsVisible = ref(true);
const overlayRef = ref<any>(null);
// Keyed by image index: the viewer keeps the neighbours mounted for the slide,
// and each of them loads and measures on its own.
const loadedSlides = ref<Record<number, boolean>>({});
const measuredSizes = ref<Record<number, { w: number; h: number }>>({});
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let zooming = false;
let pendingSize: { index: number; w: number; h: number } | null = null;

const { width: windowWidth, height: windowHeight } = useWindowSize();

// Both directions decelerate into their end state on the same curve, so the
// viewer settles onto the tile the way it grew out of it. The close is a touch
// shorter, because a movement towards something already on screen reads as
// slower than the same movement away from it.
const OPEN_DURATION = 420;
const OPEN_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const CLOSE_DURATION = 360;
const CLOSE_EASING = OPEN_EASING;
const FADE_DURATION = 300;
// Where the thumbnail hands over to the image, in animation progress. Early,
// because the thumbnail only stands for the same picture at the tile end: the
// swap happens while the frame still moves fast and hides it.
const HANDOVER = 0.28;
// The same swap on the way back. It has to happen before the frame settles:
// the tail of the close covers very little distance, so a crossfade there
// would play out in plain sight next to a nearly still frame.
const CLOSE_HANDOVER = 0.18;
// The grid tiles are rounded-md, the viewer frame is rounded-xl.
const THUMB_RADIUS = 8;
const FRAME_RADIUS = 16;
// BaseBackdrop defaults: bg-black/40 with backdrop-blur-md.
const DIM_ALPHA = 0.4;
const BLUR_RADIUS = 12;
const DIM_FROM = 'rgba(0, 0, 0, 0)';
const DIM_TO = `rgba(0, 0, 0, ${DIM_ALPHA})`;
const BLUR_FROM = 'blur(0px)';
const BLUR_TO = `blur(${BLUR_RADIUS}px)`;
// The backdrop padding, which bounds the image box.
const VIEWPORT_PADDING = 16;
// Steps used to sample the counter scale of the image inside the frame.
const ZOOM_SAMPLES = 24;

// The gap between two images on the slide track, on top of the padding each of
// them already keeps to the viewport edge.
const SLIDE_GAP = 16;
// A slide that is not thrown decelerates on the same curve as the zoom, so the
// two movements of the viewer read as one material.
const SLIDE_DURATION = 420;
const SLIDE_EASING = OPEN_EASING;
// A drag that is released short of the threshold falls back, which is a
// smaller movement than a page turn and so a shorter one.
const SNAP_DURATION = 300;
// Shortest a thrown slide may take: past this the movement stops reading as
// the finger's and starts reading as a cut.
const MIN_SLIDE_DURATION = 200;
// How far across the viewport a drag has to travel to turn the page on its own.
const SLIDE_DISTANCE_RATIO = 0.22;
// Speed in px/ms that turns the page from a short flick.
const SLIDE_VELOCITY = 0.35;
// Movement in px before the gesture commits to an axis.
const AXIS_LOCK_THRESHOLD = 6;
// A drag past the first or last image follows the finger at this fraction, so
// the track feels attached to something rather than stuck.
const EDGE_RESISTANCE = 0.3;

// Swipe down to close. Lower than BaseSheet's numbers on purpose: there is
// nothing to read underneath the image, so letting go of it should be easy.
const DISMISS_DISTANCE = 60;
const DISMISS_VELOCITY = 0.3;
// The shortest flick that still counts as one, rather than as a tap that
// happened to move.
const DISMISS_FLICK_DISTANCE = 12;
// A pull upwards has nowhere to go, so it only hints at the movement.
const DISMISS_RUBBER_BAND = 0.1;
// How far the image travels sideways before it stops following the finger.
// The number is the share of the viewport width it approaches but never
// reaches, so the pull gets weaker the further out it goes.
const DISMISS_SIDEWAYS = 0.55;
// How far the backdrop clears, and over what distance. The fade is spread
// over more than the dismiss distance, otherwise the picture would be left
// standing on a bare background long before the pull counts.
const DISMISS_BACKDROP_FADE = 0.6;
const DISMISS_FADE_DISTANCE = 200;
// How far the image shrinks over a whole screen of drag: a full screen takes
// it to 0.6, which is what makes it read as being pushed away.
const DISMISS_SCALE = 0.4;
// The way back when the pull was not enough. Short, because nothing changes.
const DISMISS_RETURN_DURATION = 200;
const DISMISS_RETURN_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

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
function thumbSrc(img: any): string {
  if (!img) return '';
  return img.thumbUrl || makeThumb(img.metadata?.thumbnailId || img.publicId);
}

// Only a known aspect ratio lets the final frame be laid out before the full
// image arrives, which is what the zoom animates towards. The stored metadata
// can disagree with what the image really is, for example when it was rotated
// on delivery, so the loaded image corrects it.
function naturalSize(index: number) {
  const measured = measuredSizes.value[index];
  if (measured) return measured;

  const metadata = props.images[index]?.metadata as any;
  const w = Number(metadata?.width);
  const h = Number(metadata?.height);
  return w > 0 && h > 0 ? { w, h } : null;
}

function frameSize(index: number) {
  const natural = naturalSize(index);
  if (!natural) return null;

  const availableW = Math.max(0, windowWidth.value - VIEWPORT_PADDING * 2);
  const availableH = Math.max(0, windowHeight.value - VIEWPORT_PADDING * 2);
  // Matches max-w-full/max-h-full: contain, never upscaled.
  const scale = Math.min(availableW / natural.w, availableH / natural.h, 1);

  return { w: natural.w * scale, h: natural.h * scale };
}

function frameStyle(index: number) {
  const size = frameSize(index);
  return size ? { width: `${size.w}px`, height: `${size.h}px` } : undefined;
}

const currentFrameSize = computed(() => frameSize(currentIndex.value));
const fullLoaded = computed(() => !!loadedSlides.value[currentIndex.value]);

function focusOverlay() {
  (overlayRef.value?.$el as HTMLElement | undefined)?.focus?.();
}

// Slide track ------------------------------------------------------------
//
// Every mounted image sits at its own index on one long horizontal track, and
// the track is what moves: a drag offsets it by the finger, a page turn
// animates it to the next stop. That way the button and the gesture drive the
// same movement, and a turn started mid-drag continues from where the finger
// left the track rather than from a standstill.

const trackRef = ref<HTMLElement | null>(null);
const dragOffset = ref(0);
const slideTransition = ref<string | null>(null);
// The index the track is still travelling away from. It stays mounted so it
// does not vanish out of the middle of its own slide.
const travellingFrom = ref<number | null>(null);
let settleTimer: ReturnType<typeof setTimeout> | null = null;

// One image per viewport width, plus the gap between two of them.
const pageStep = computed(() => windowWidth.value + SLIDE_GAP);

const slides = computed(() => {
  const from = travellingFrom.value ?? currentIndex.value;
  const first = Math.max(0, Math.min(from, currentIndex.value) - 1);
  const last = Math.min(
    props.images.length - 1,
    Math.max(from, currentIndex.value) + 1,
  );

  const list = [];
  for (let index = first; index <= last; index++) {
    list.push({ index, image: props.images[index] });
  }
  return list;
});

const trackStyle = computed(() => ({
  transform: `translate3d(${dragOffset.value - currentIndex.value * pageStep.value}px, 0, 0)`,
  transition: slideTransition.value ?? 'none',
}));

function slideStyle(index: number) {
  return {
    transform: `translate3d(${index * pageStep.value}px, 0, 0)`,
    // The stage shrinks and leans as it is swiped away, which brings the
    // images parked beside the current one back into the viewport. Only the
    // one being swiped belongs on screen, so the rest step out for the
    // length of the gesture.
    visibility:
      dismissActive.value && index !== currentIndex.value
        ? 'hidden'
        : undefined,
  };
}

// Where the track really is on screen, which during a slide is somewhere
// between two stops. A drag starts from there instead of from the stop it is
// heading for, so grabbing a moving track picks it up rather than snapping it.
function trackOffset() {
  const el = trackRef.value;
  if (!el) return dragOffset.value;

  try {
    const transform = getComputedStyle(el).transform;
    if (!transform || transform === 'none') return dragOffset.value;
    const matrix = new DOMMatrixReadOnly(transform);
    return matrix.m41 + currentIndex.value * pageStep.value;
  } catch {
    return dragOffset.value;
  }
}

function clearSettleTimer() {
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
}

// The transition is dropped once it has played out, so the next drag picks the
// track up without having to fight a transition that is still installed.
function settleTrack(duration: number) {
  clearSettleTimer();
  settleTimer = setTimeout(() => {
    settleTimer = null;
    slideTransition.value = null;
    travellingFrom.value = null;
  }, duration + 40);
}

function slideTo(index: number, duration = SLIDE_DURATION) {
  if (index === currentIndex.value || index < 0) return;
  if (index > props.images.length - 1) return;

  if (prefersReducedMotion()) {
    slideTransition.value = null;
    travellingFrom.value = null;
    clearSettleTimer();
  } else {
    slideTransition.value = `transform ${duration}ms ${SLIDE_EASING}`;
    travellingFrom.value = currentIndex.value;
    settleTrack(duration);
  }

  dragOffset.value = 0;
  currentIndex.value = index;
  void nextTick(() => focusOverlay());
}

function next() {
  if (hasNext.value) slideTo(currentIndex.value + 1);
}

function prev() {
  if (hasPrev.value) slideTo(currentIndex.value - 1);
}

// Swipe to close ---------------------------------------------------------
//
// The stage carries the whole viewer, so the image is pushed away as one piece
// and the track keeps the horizontal offset to itself. It stays where the
// gesture left it while the close runs, which is what lets the frame fly from
// there into its tile.

const dismissOffset = ref(0);
const dismissSideways = ref(0);
const dismissTransition = ref<string | null>(null);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

// Follows the finger less and less the further out it goes, and never reaches
// the limit it is heading for. The same curve iOS pulls its sheets sideways
// on.
function rubberBand(distance: number, limit: number) {
  if (!limit) return 0;
  const travelled = Math.abs(distance);
  return Math.sign(distance) * ((travelled * limit) / (limit + travelled));
}

// The way back out of the band, so a drag can be picked up again where the
// last one left the image rather than where the finger had to be for it.
function unRubberBand(offset: number, limit: number) {
  const banded = Math.abs(offset);
  if (!limit || banded >= limit) return offset;
  return Math.sign(offset) * ((banded * limit) / (limit - banded));
}

// True from the first movement of a dismiss drag until the stage is back at
// rest, the return transition included.
const dismissActive = computed(
  () =>
    dismissOffset.value !== 0 ||
    dismissSideways.value !== 0 ||
    dismissTransition.value !== null,
);

const dismissScale = computed(() => {
  const pulled = Math.max(0, dismissOffset.value);
  if (!pulled || !windowHeight.value) return 1;
  return 1 - Math.min(pulled / windowHeight.value, 1) * DISMISS_SCALE;
});

// How far the pull has got, for everything that answers it rather than
// follows it: the dim, and nothing else so far.
const dismissProgress = computed(() =>
  Math.min(Math.max(0, dismissOffset.value) / DISMISS_FADE_DISTANCE, 1),
);

const stageStyle = computed(() => ({
  transform: `translate3d(${dismissSideways.value}px, ${dismissOffset.value}px, 0px) scale(${dismissScale.value})`,
  transition: dismissTransition.value ?? 'none',
}));

const backdropStyle = computed(() => {
  if (!dismissProgress.value && !dismissTransition.value) return undefined;

  return {
    ...dimAt(1 - dismissProgress.value * DISMISS_BACKDROP_FADE),
    transition: dismissTransition.value
      ? `background-color ${DISMISS_RETURN_DURATION}ms ease, backdrop-filter ${DISMISS_RETURN_DURATION}ms ease`
      : 'none',
  };
});

function clearDismissTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function resetDismiss() {
  clearDismissTimer();
  dismissOffset.value = 0;
  dismissSideways.value = 0;
  dismissTransition.value = null;
}

// Slide gesture ----------------------------------------------------------

let dragStartX = 0;
let dragStartY = 0;
let dragBase = 0;
let dismissBase = 0;
let sidewaysBase = 0;
let lastDragX = 0;
let lastDragY = 0;
let lastDragTime = 0;
let dragVelocity = 0;
let dismissVelocity = 0;
let dragging = false;
let dragAxis: 'none' | 'x' | 'y' = 'none';
let dragMoved = false;
// When a drag last let go. The click a touch sequence ends with belongs to
// that drag, not to the backdrop, so it must not close the viewer.
let dragEndedAt = 0;

function onSlideStart(e: TouchEvent) {
  if (zooming || e.touches.length !== 1) return;

  const touch = e.touches[0];
  if (!touch) return;

  // Dropping the transition and taking over its offset in the same tick keeps
  // a track caught mid-slide from jumping to the stop it was heading for.
  dragBase = trackOffset();
  clearSettleTimer();
  slideTransition.value = null;
  dragOffset.value = dragBase;

  // The same handover for a stage caught on its way back up. The sideways
  // lean is read back through the rubber band, so picking it up does not
  // snap it to a different place than it was drawn at.
  dismissBase = dismissOffset.value;
  sidewaysBase = unRubberBand(
    dismissSideways.value,
    windowWidth.value * DISMISS_SIDEWAYS,
  );
  clearDismissTimer();
  dismissTransition.value = null;

  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
  lastDragX = touch.clientX;
  lastDragY = touch.clientY;
  lastDragTime = e.timeStamp;
  dragVelocity = 0;
  dismissVelocity = 0;
  dragging = true;
  dragAxis = 'none';
  dragMoved = false;
}

function onSlideMove(e: TouchEvent) {
  if (!dragging) return;

  const touch = e.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  if (dragAxis === 'none') {
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
      return;
    }
    dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
  }

  if (e.cancelable) e.preventDefault();

  // Only the last stretch of the drag decides the throw, the way a flick that
  // ends at a standstill should not turn the page.
  const elapsed = e.timeStamp - lastDragTime;
  if (elapsed > 0) {
    dragVelocity = (touch.clientX - lastDragX) / elapsed;
    dismissVelocity = (touch.clientY - lastDragY) / elapsed;
    lastDragX = touch.clientX;
    lastDragY = touch.clientY;
    lastDragTime = e.timeStamp;
  }

  if (dragAxis === 'y') {
    const pulled = dismissBase + deltaY;
    dismissOffset.value = pulled < 0 ? pulled * DISMISS_RUBBER_BAND : pulled;
    // Sideways the image is not going anywhere, so it only leans after the
    // finger, and less the further it already leans.
    dismissSideways.value = rubberBand(
      sidewaysBase + deltaX,
      windowWidth.value * DISMISS_SIDEWAYS,
    );
    dragMoved = true;
    // The controls belong to the image at rest, so they step aside while it
    // is being pushed away.
    hideControls();
    return;
  }

  const raw = dragBase + deltaX;
  const pulling = raw > 0 ? !hasPrev.value : !hasNext.value;
  dragOffset.value = pulling ? raw * EDGE_RESISTANCE : raw;
  dragMoved = true;
  showControls();
}

// A thrown track keeps the speed it was released at, so the animation carries
// the gesture on instead of restarting it.
function throwDuration(remaining: number) {
  const speed = Math.abs(dragVelocity);
  if (speed < 0.1) return SLIDE_DURATION;
  return Math.min(
    SLIDE_DURATION,
    Math.max(MIN_SLIDE_DURATION, remaining / speed),
  );
}

function onSlideEnd() {
  if (!dragging) return;
  dragging = false;

  // A tap leaves the track where it was, but may still have taken a running
  // slide's transition off it, so the track is handed back either way.
  if (dragAxis === 'none' || !dragMoved) {
    settleTrack(0);
    return;
  }

  dragEndedAt = Date.now();

  if (dragAxis === 'y') {
    onDismissEnd();
    return;
  }

  const offset = dragOffset.value;
  const distance = Math.abs(offset);
  const enough =
    distance > windowWidth.value * SLIDE_DISTANCE_RATIO ||
    (Math.abs(dragVelocity) > SLIDE_VELOCITY && distance > 10);
  const target = offset < 0 ? currentIndex.value + 1 : currentIndex.value - 1;
  const canTurn = offset < 0 ? hasNext.value : hasPrev.value;

  if (enough && canTurn) {
    slideTo(target, throwDuration(Math.max(0, pageStep.value - distance)));
    return;
  }

  if (offset === 0) {
    settleTrack(0);
    return;
  }

  slideTransition.value = prefersReducedMotion()
    ? null
    : `transform ${SNAP_DURATION}ms ${SLIDE_EASING}`;
  dragOffset.value = 0;
  settleTrack(SNAP_DURATION);
}

function onDismissEnd() {
  const pulled = dismissOffset.value;
  const enough =
    pulled > DISMISS_DISTANCE ||
    (dismissVelocity > DISMISS_VELOCITY && pulled > DISMISS_FLICK_DISTANCE);

  // The stage keeps the offset it was let go at, and the close animation picks
  // the frame up from there and carries it into its tile.
  if (enough) {
    cancel();
    return;
  }

  if (prefersReducedMotion()) {
    resetDismiss();
    showControls();
    return;
  }

  dismissTransition.value = `transform ${DISMISS_RETURN_DURATION}ms ${DISMISS_RETURN_EASING}`;
  dismissOffset.value = 0;
  dismissSideways.value = 0;

  clearDismissTimer();
  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    dismissTransition.value = null;
  }, DISMISS_RETURN_DURATION + 40);

  showControls();
}

function onBackdropClick() {
  // The tap that ends a drag is the drag's, not a close.
  if (Date.now() - dragEndedAt < 400) return;
  cancel();
}

function cancel() {
  emit('cancel');
}

function openMenu(event: MouseEvent) {
  props.menu?.(event, currentIndex.value);
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

function hideControls() {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  controlsVisible.value = false;
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
  if (prefersReducedMotion() || !currentFrameSize.value) return null;

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
// `stageScale` is what the dismiss gesture left on the stage above the frame.
// The frame's own translation is measured on screen but applied underneath
// that scale, so it has to be divided back out or the frame lands short of
// its tile.
function zoomKeyframes(tile: DOMRect, frame: DOMRect, stageScale = 1) {
  const sx = tile.width / frame.width;
  const sy = tile.height / frame.height;
  const dx =
    (tile.left + tile.width / 2 - (frame.left + frame.width / 2)) / stageScale;
  const dy =
    (tile.top + tile.height / 2 - (frame.top + frame.height / 2)) / stageScale;
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
    // Not the reverse of the above: reversing it would put the crossfade in
    // the slow tail instead of the fast opening stretch of the close.
    thumbClose: [
      { offset: 0, opacity: 0 },
      { offset: CLOSE_HANDOVER, opacity: 1 },
      { offset: 1, opacity: 1 },
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

// The dim at a given strength, 1 being the backdrop at rest. Only the colour
// and the blur are touched: the element's own opacity would take the picture
// down with it, since the picture sits inside the backdrop.
function dimAt(strength: number) {
  return {
    backgroundColor: `rgba(0, 0, 0, ${DIM_ALPHA * strength})`,
    backdropFilter: `blur(${BLUR_RADIUS * strength}px)`,
    webkitBackdropFilter: `blur(${BLUR_RADIUS * strength}px)`,
  };
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
  const controls = backdrop.querySelector<HTMLElement>(
    '[data-viewer-controls]',
  );
  return frame && inner ? { frame, inner, thumb, controls } : null;
}

// The controls belong to the frame, so they arrive and leave with it on the
// same curve as the dim, rather than waiting for the zoom to be over.
function controlsKeyframes(): Keyframe[] {
  return [{ opacity: 0 }, { opacity: 1 }];
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

  if (parts.controls) {
    animations.push(parts.controls.animate(controlsKeyframes(), options));
  }

  const showTile = hideTile(tile);
  zooming = true;

  settle(animations, () => {
    zooming = false;
    if (pendingSize) {
      measuredSizes.value[pendingSize.index] = {
        w: pendingSize.w,
        h: pendingSize.h,
      };
      pendingSize = null;
    }
    showTile();
    // The controls are already up; this only starts the idle timer that takes
    // them away again.
    showControls();
    done();
  });
}

function onLeave(el: Element, done: () => void) {
  const backdrop = el as HTMLElement;
  const parts = zoomParts(backdrop);
  const tile = parts ? originTile() : null;

  if (hideTimeout) clearTimeout(hideTimeout);

  if (!tile || !parts) {
    // The whole backdrop fades, controls included.
    controlsVisible.value = false;

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
    dismissScale.value,
  );
  const animations = [
    // From the dim the gesture left behind, not from full strength, so a
    // close that starts mid-drag does not put the dim back first.
    backdrop.animate(
      [dimAt(1 - dismissProgress.value * DISMISS_BACKDROP_FADE), dimAt(0)],
      options,
    ),
    parts.frame.animate(reversed(keyframes.frame), options),
    parts.inner.animate(reversed(keyframes.inner), options),
  ];

  // Back to the thumbnail before the frame reaches the tile, so what lands is
  // the tile itself rather than an image that has to match it.
  if (parts.thumb && fullLoaded.value) {
    animations.push(parts.thumb.animate(keyframes.thumbClose, options));
  }

  // Controls the idle timer has already taken away are gone, and fading a
  // hidden element would only hold it in the layout for nothing.
  if (parts.controls && controlsVisible.value) {
    animations.push(
      parts.controls.animate(reversed(controlsKeyframes()), options),
    );
  }

  const showTile = hideTile(tile);

  settle(animations, () => {
    showTile();
    done();
  });
}

function onFullLoad(event: Event, index: number) {
  const img = event.target as HTMLImageElement;
  loadedSlides.value[index] = true;

  if (!img.naturalWidth || !img.naturalHeight) return;

  const natural = naturalSize(index);
  const loaded = { w: img.naturalWidth, h: img.naturalHeight };
  const matches =
    natural && Math.abs(natural.w / natural.h - loaded.w / loaded.h) < 0.01;

  if (matches) return;

  // The frame is the wrong shape for this image, so the picture would sit in
  // it with a margin that the tile does not have. Resize it, but not while the
  // zoom is running off the rect it started with.
  if (zooming && index === currentIndex.value) {
    pendingSize = { index, ...loaded };
  } else {
    measuredSizes.value[index] = loaded;
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentIndex.value = props.initialIndex;
      loadedSlides.value = {};
      measuredSizes.value = {};
      pendingSize = null;
      dragOffset.value = 0;
      slideTransition.value = null;
      travellingFrom.value = null;
      clearSettleTimer();
      resetDismiss();
      // The controls arrive with the frame, driven by the open animation, so
      // they are up from the first render and start out transparent.
      controlsVisible.value = true;
      document.body.style.overflow = 'hidden';
      void nextTick(() => focusOverlay());
    } else {
      document.body.style.overflow = '';
    }
  },
);

onBeforeUnmount(() => {
  if (hideTimeout) clearTimeout(hideTimeout);
  clearSettleTimer();
  clearDismissTimer();
});
</script>

<template>
  <Transition :css="false" @enter="onEnter" @leave="onLeave">
    <BaseBackdrop
      v-if="visible"
      ref="overlayRef"
      class="z-[100002] p-4"
      :style="backdropStyle"
      tabindex="0"
      @mousemove="onActivity"
      @cancel="cancel"
      @touchstart="onActivity"
      @keydown="handleKeydown"
    >
      <div
        class="w-full h-full touch-pan-y"
        @click.self="onBackdropClick"
        @touchstart.passive="onSlideStart"
        @touchmove="onSlideMove"
        @touchend="onSlideEnd"
        @touchcancel="onSlideEnd"
      >
        <!-- Pushed away as one piece by the downward swipe, so the track
             underneath only ever deals with the horizontal offset. -->
        <div
          data-viewer-stage
          class="absolute inset-0 will-change-transform"
          :style="stageStyle"
        >
          <!-- Every mounted image keeps its own place on the track, and the
               track is what the gesture and the keyboard move. -->
          <div
            ref="trackRef"
            data-viewer-track
            class="absolute inset-0 will-change-transform"
            :style="trackStyle"
          >
            <div
              v-for="slide in slides"
              :key="slide.index"
              class="absolute inset-0 flex items-center justify-center"
              :style="slideStyle(slide.index)"
              @click.self="onBackdropClick"
            >
              <iframe
                v-if="slide.image && isOffice(slide.image)"
                :src="getOfficeViewerSrc(slide.image)"
                class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white shadow-menu"
                @click.stop
              ></iframe>
              <iframe
                v-else-if="slide.image && isPdf(slide.image)"
                :src="getImageSrc(slide.image)"
                class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white shadow-menu"
                @click.stop
              ></iframe>
              <div
                v-else-if="slide.image && frameSize(slide.index)"
                :data-viewer-frame="slide.index === currentIndex ? '' : null"
                class="relative max-w-full max-h-full overflow-hidden rounded-xl shadow-menu will-change-transform"
                :style="frameStyle(slide.index)"
                @click.stop
              >
                <div
                  :data-viewer-inner="slide.index === currentIndex ? '' : null"
                  class="absolute inset-0 will-change-transform"
                >
                  <img
                    :src="getImageSrc(slide.image)"
                    class="absolute inset-0 w-full h-full object-contain"
                    draggable="false"
                    alt=""
                    @load="onFullLoad($event, slide.index)"
                  />
                </div>

                <!-- Sits on top of the image and outside the counter scaled
                   layer. object-fill, because the frame is squashed onto the
                   tile at that end of the zoom and the two stretches cancel
                   out: the square thumbnail then lands on the tile exactly as
                   the tile draws it. That is what makes the handover
                   invisible. -->
                <img
                  v-if="thumbSrc(slide.image)"
                  :src="thumbSrc(slide.image)"
                  :data-viewer-thumb="slide.index === currentIndex ? '' : null"
                  class="absolute inset-0 w-full h-full object-fill transition-opacity duration-200 ease-out"
                  :class="
                    loadedSlides[slide.index] ? 'opacity-0' : 'opacity-100'
                  "
                  draggable="false"
                  aria-hidden="true"
                  alt=""
                />
              </div>
              <img
                v-else-if="slide.image"
                :src="getImageSrc(slide.image)"
                class="max-w-full max-h-full rounded-xl object-contain shadow-menu"
                draggable="false"
                alt=""
                @click.stop
              />
            </div>
          </div>
        </div>
      </div>

      <Transition name="fade-controls">
        <div
          v-show="controlsVisible"
          data-viewer-controls
          class="fixed inset-0 pointer-events-none"
        >
          <!-- On a phone the close button sits where the thumb reaches it and
               leaves the corner it came from to the menu. -->
          <button
            v-wave
            class="absolute top-4 left-4 md:left-auto md:right-4 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="cancel"
          >
            <X />
          </button>

          <button
            v-if="menu"
            v-wave
            class="absolute top-4 right-4 md:hidden pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="openMenu"
          >
            <Ellipsis />
          </button>

          <!-- A pointer has no swipe, so the arrows stay on the desktop. -->
          <button
            v-if="hasPrev"
            v-wave
            class="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full hidden md:flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="prev"
          >
            <ChevronLeft />
          </button>

          <button
            v-if="hasNext"
            v-wave
            class="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full hidden md:flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
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
