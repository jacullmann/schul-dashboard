<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  nextTick,
  onBeforeUnmount,
  type CSSProperties,
} from 'vue';
import { useWindowSize } from '@vueuse/core';
import { prefersReducedMotion } from '@/utils/motion';
import { X, Ellipsis, ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  fileUrl,
  isOfficeDocument,
  isPdf,
  previewUrl,
  type StoredFile,
} from '@/api/files';

const props = defineProps<{
  visible: boolean;
  images: StoredFile[];
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
// Set once the close has taken over, so an open that is cut short does not
// finish its own bookkeeping on an element that is already on its way out.
let leaving = false;
// The dim of the open. A swipe that starts while it still runs takes the dim
// over, so it has to be able to stop it where it is.
let openDimAnimation: Animation | null = null;
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
// The tile fades back in under the viewer once the zoom has left it.
const TILE_FADE_IN_DURATION = FADE_DURATION;
// Short, so the slot is empty well before the closing frame arrives in it.
const TILE_FADE_OUT_DURATION = 150;
// Where the thumbnail hands over to the image, in animation progress. Early,
// because the thumbnail only stands for the same picture at the tile end: the
// swap happens while the frame still moves fast and hides it.
const HANDOVER = 0.28;
// The same swap on the way back. It has to happen before the frame settles:
// the tail of the close covers very little distance, so a crossfade there
// would play out in plain sight next to a nearly still frame.
const CLOSE_HANDOVER = 0.18;
// The grid tiles are rounded-sm, the viewer frame is rounded-xl.
const THUMB_RADIUS = 4;
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

// Pinch to zoom. The image never grows past this many times the size it fits
// the screen at.
const MAX_ZOOM = 4;
// A pinch past either end of the range follows the fingers at a falling rate,
// as the share of the scale it approaches but never reaches past that end.
const ZOOM_RUBBER_BAND = 0.5;
// How far a zoomed in image can be pulled past its edge, as the share of the
// viewport it approaches but never reaches.
const PAN_OVERSCROLL = 0.15;
// How close in px an image has to sit to its edge for a pan to count as
// starting there. Reading a zoom back off the screen can leave it a fraction
// of a pixel short.
const PAN_EDGE_TOLERANCE = 1;
// A pan that is let go of carries on as far as it would travel in this many
// ms at the speed it was released at.
const PAN_MOMENTUM = 200;

const hasNext = computed(() => currentIndex.value < props.images.length - 1);
const hasPrev = computed(() => currentIndex.value > 0);

// Documents bring their own viewer, which handles its own pinch.
const isZoomable = (img: StoredFile | undefined) =>
  !!img && !isPdf(img) && !isOfficeDocument(img);

function getOfficeViewerSrc(img: StoredFile): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl(img))}`;
}

// The thumbnail is already in the browser cache, so it stands in for the full
// image while that one loads and the zoom runs.
function thumbSrc(img: StoredFile): string | undefined {
  return previewUrl(img) ?? undefined;
}

// Only a known aspect ratio lets the final frame be laid out before the full
// image arrives, which is what the zoom animates towards. The stored size
// can disagree with what the image really is, for example when it was rotated
// on delivery, so the loaded image corrects it.
function naturalSize(index: number) {
  const measured = measuredSizes.value[index];
  if (measured) return measured;

  const image = props.images[index];
  const w = image?.width ?? 0;
  const h = image?.height ?? 0;
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
  if (!size) return undefined;

  return {
    width: `${size.w}px`,
    height: `${size.h}px`,
    // The zoom scales the corners along with the picture, so they are
    // counter scaled to stay the size they are at rest.
    borderRadius: zoomedAt(index)
      ? `${FRAME_RADIUS / zoomScale.value}px`
      : undefined,
  };
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

function slideStyle(index: number): CSSProperties {
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
    // An image zoomed in on keeps its zoom until it has left the screen.
    if (zoomedIndex.value !== currentIndex.value) resetZoom();
  }, duration + 40);
}

function slideTo(index: number, duration = SLIDE_DURATION) {
  if (index === currentIndex.value || index < 0) return;
  if (index > props.images.length - 1) return;

  if (prefersReducedMotion()) {
    slideTransition.value = null;
    travellingFrom.value = null;
    clearSettleTimer();
    resetZoom();
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
// How far the dim had got when a swipe caught the open halfway, 1 being the
// backdrop at rest. The swipe fades from there instead of from full strength.
const openDim = ref(1);
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
  if (
    !dismissProgress.value &&
    !dismissTransition.value &&
    openDim.value === 1
  ) {
    return undefined;
  }

  return {
    ...dimAt(
      openDim.value * (1 - dismissProgress.value * DISMISS_BACKDROP_FADE),
    ),
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
  openDim.value = 1;
}

// A swipe that starts while the viewer is still opening takes the dim over
// where the open has got it to, so the backdrop answers the finger right away
// instead of only once the open is done.
function takeOverOpenDim() {
  const animation = openDimAnimation;
  if (!animation || animation.playState === 'finished') return;

  const backdrop = overlayRef.value?.$el as HTMLElement | undefined;
  if (backdrop) {
    const alpha = colorAlpha(getComputedStyle(backdrop).backgroundColor);
    openDim.value = Math.min(1, Math.max(0, alpha / DIM_ALPHA));
  }

  openDimAnimation = null;
  animation.cancel();
}

// Pinch to zoom ----------------------------------------------------------
//
// The zoom sits on a layer of its own between the slide and the frame, so the
// open and close animations keep the frame to themselves. It is held in
// screen pixels from the viewport centre, around which the layer scales. The
// image it belongs to keeps it while a page turn carries it off screen.

const zoomedIndex = ref<number | null>(null);
const zoomScale = ref(1);
const zoomX = ref(0);
const zoomY = ref(0);
const zoomTransition = ref<string | null>(null);
let zoomTimer: ReturnType<typeof setTimeout> | null = null;

const isZoomed = computed(
  () => zoomedIndex.value === currentIndex.value && zoomScale.value > 1,
);

function zoomedAt(index: number) {
  return zoomedIndex.value === index && zoomScale.value !== 1;
}

function zoomStyle(index: number): CSSProperties | undefined {
  if (index !== zoomedIndex.value) return undefined;
  return {
    transform: `translate3d(${zoomX.value}px, ${zoomY.value}px, 0) scale(${zoomScale.value})`,
    transition: zoomTransition.value ?? 'none',
  };
}

function zoomLayer() {
  const backdrop = overlayRef.value?.$el as HTMLElement | undefined;
  return backdrop?.querySelector<HTMLElement>('[data-viewer-zoom]') ?? null;
}

function clearZoomTimer() {
  if (zoomTimer) {
    clearTimeout(zoomTimer);
    zoomTimer = null;
  }
}

function resetZoom() {
  clearZoomTimer();
  zoomedIndex.value = null;
  zoomScale.value = 1;
  zoomX.value = 0;
  zoomY.value = 0;
  zoomTransition.value = null;
}

function clampTo(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

// Past either end of the range the scale follows the pinch less and less.
function bandZoom(scale: number) {
  if (scale < 1) return 1 - rubberBand(1 - scale, ZOOM_RUBBER_BAND);
  if (scale > MAX_ZOOM) {
    return MAX_ZOOM * (1 + rubberBand(scale / MAX_ZOOM - 1, ZOOM_RUBBER_BAND));
  }
  return scale;
}

// How far off centre the image can sit at a scale before an edge of it comes
// away from the edge of the viewport. Read from the layout, which transforms
// leave alone, so it holds for a frame of known size and a bare image alike.
function panLimits(scale: number) {
  const content = zoomLayer()?.firstElementChild as HTMLElement | null;
  if (!content) return { x: 0, y: 0 };

  return {
    x: Math.max(0, (content.offsetWidth * scale - windowWidth.value) / 2),
    y: Math.max(0, (content.offsetHeight * scale - windowHeight.value) / 2),
  };
}

// The nearest state inside the limits: the scale brought back into range
// around `focus`, which stays where it is on screen, and the image moved no
// further than its edges allow at that scale.
function zoomTarget(
  scale: number,
  x: number,
  y: number,
  focusX = 0,
  focusY = 0,
) {
  const target = Math.min(Math.max(scale, 1), MAX_ZOOM);
  if (target === 1) return { scale: 1, x: 0, y: 0 };

  const ratio = target / scale;
  const limits = panLimits(target);
  return {
    scale: target,
    x: clampTo(focusX - ratio * (focusX - x), limits.x),
    y: clampTo(focusY - ratio * (focusY - y), limits.y),
  };
}

function animateZoom(
  target: { scale: number; x: number; y: number },
  duration: number,
) {
  clearZoomTimer();
  if (
    target.scale === zoomScale.value &&
    target.x === zoomX.value &&
    target.y === zoomY.value
  ) {
    return;
  }

  if (prefersReducedMotion()) {
    zoomTransition.value = null;
  } else {
    zoomTransition.value = `transform ${duration}ms ${SLIDE_EASING}`;
    zoomTimer = setTimeout(() => {
      zoomTimer = null;
      zoomTransition.value = null;
    }, duration + 40);
  }

  zoomScale.value = target.scale;
  zoomX.value = target.x;
  zoomY.value = target.y;
}

function settleZoom() {
  if (zoomedIndex.value !== currentIndex.value) return;
  animateZoom(
    zoomTarget(zoomScale.value, zoomX.value, zoomY.value),
    SNAP_DURATION,
  );
}

// The same handover as for the track: a zoom still easing into place is
// picked up where it is drawn, not where it is heading.
function takeOverZoom() {
  if (!zoomTransition.value) return;

  const layer = zoomLayer();
  if (layer) {
    const matrix = matrixOf(layer);
    zoomScale.value = matrix.a || 1;
    zoomX.value = matrix.e;
    zoomY.value = matrix.f;
  }

  clearZoomTimer();
  zoomTransition.value = null;
}

let pinching = false;
let pinchIds: [number, number] = [0, 0];
let pinchStartDistance = 1;
let pinchStartScale = 1;
let pinchStartX = 0;
let pinchStartY = 0;
// Relative to the viewport centre, like the zoom itself.
let pinchStartFocusX = 0;
let pinchStartFocusY = 0;
let pinchFocusX = 0;
let pinchFocusY = 0;

function pinchTouches(touches: TouchList) {
  const list = Array.from(touches);
  const first = list.find((touch) => touch.identifier === pinchIds[0]);
  const second = list.find((touch) => touch.identifier === pinchIds[1]);
  return first && second ? ([first, second] as const) : null;
}

function startPinch(e: TouchEvent) {
  if (pinching || !isZoomable(props.images[currentIndex.value])) return;
  // A drag that already turns the page or pushes the image away keeps the
  // gesture: scaling the image under it would leave neither in a sensible
  // place.
  if (dragging && (dragAxis === 'x' || dragAxis === 'y')) return;
  if (dragOffset.value !== 0 || dismissActive.value) return;

  const [first, second] = [e.touches[0], e.touches[1]];
  if (!first || !second) return;

  const distance = Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  );
  if (!distance) return;

  // The finger that was already down gives up its drag to the pinch.
  dragging = false;
  settleTrack(0);
  takeOverZoom();
  hideControls();

  if (zoomedIndex.value !== currentIndex.value) resetZoom();
  zoomedIndex.value = currentIndex.value;

  pinching = true;
  pinchIds = [first.identifier, second.identifier];
  pinchStartDistance = distance;
  pinchStartScale = zoomScale.value;
  pinchStartX = zoomX.value;
  pinchStartY = zoomY.value;
  pinchStartFocusX =
    (first.clientX + second.clientX) / 2 - windowWidth.value / 2;
  pinchStartFocusY =
    (first.clientY + second.clientY) / 2 - windowHeight.value / 2;
  pinchFocusX = pinchStartFocusX;
  pinchFocusY = pinchStartFocusY;
}

// The point of the image that was between the fingers when the pinch started
// stays between them, so the image scales around the fingers and follows them
// when they move together.
function onPinchMove(e: TouchEvent) {
  const touches = pinchTouches(e.touches);
  if (!touches) return;
  if (e.cancelable) e.preventDefault();

  const [first, second] = touches;
  const distance = Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  );
  const scale = bandZoom((pinchStartScale * distance) / pinchStartDistance);
  const ratio = scale / pinchStartScale;

  pinchFocusX = (first.clientX + second.clientX) / 2 - windowWidth.value / 2;
  pinchFocusY = (first.clientY + second.clientY) / 2 - windowHeight.value / 2;
  zoomScale.value = scale;
  zoomX.value = pinchFocusX - ratio * (pinchStartFocusX - pinchStartX);
  zoomY.value = pinchFocusY - ratio * (pinchStartFocusY - pinchStartY);
}

// Ends once either pinching finger lifts. The other one is left without a
// gesture until it lifts too, since the one it started with is over.
function onPinchEnd(e: TouchEvent) {
  if (pinchTouches(e.touches)) return;

  pinching = false;
  dragEndedAt = Date.now();
  animateZoom(
    zoomTarget(
      zoomScale.value,
      zoomX.value,
      zoomY.value,
      pinchFocusX,
      pinchFocusY,
    ),
    SNAP_DURATION,
  );
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
let dragVelocityX = 0;
let dragVelocityY = 0;
let dragging = false;
// A drag on a zoomed in image pans it rather than turning the page or
// pushing the image away.
let dragAxis: 'none' | 'x' | 'y' | 'pan' = 'none';
let dragMoved = false;
// When a drag last let go. The click a touch sequence ends with belongs to
// that drag, not to the backdrop, so it must not close the viewer.
let dragEndedAt = 0;
let panBaseX = 0;
let panBaseY = 0;
// Whether the pan started with the image against its left or right edge,
// which is the only way it may turn the page towards that side.
let panTurnsToPrev = false;
let panTurnsToNext = false;

function onSlideStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    startPinch(e);
    return;
  }

  // The open does not lock the gesture out: the frame keeps growing on its
  // own layer while the stage above it follows the finger.
  if (e.touches.length !== 1) return;

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

  takeOverZoom();
  panBaseX = zoomX.value;
  panBaseY = zoomY.value;
  if (isZoomed.value) {
    const limits = panLimits(zoomScale.value);
    panTurnsToPrev = panBaseX >= limits.x - PAN_EDGE_TOLERANCE;
    panTurnsToNext = panBaseX <= -limits.x + PAN_EDGE_TOLERANCE;
  }

  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
  lastDragX = touch.clientX;
  lastDragY = touch.clientY;
  lastDragTime = e.timeStamp;
  dragVelocityX = 0;
  dragVelocityY = 0;
  dragging = true;
  dragAxis = 'none';
  dragMoved = false;
}

function onSlideMove(e: TouchEvent) {
  if (pinching) {
    onPinchMove(e);
    return;
  }
  if (!dragging) return;

  const touch = e.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  if (dragAxis === 'none') {
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
      return;
    }
    if (isZoomed.value) dragAxis = 'pan';
    else dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    if (dragAxis === 'y') takeOverOpenDim();
  }

  if (e.cancelable) e.preventDefault();

  // Only the last stretch of the drag decides the throw, the way a flick that
  // ends at a standstill should not turn the page.
  const elapsed = e.timeStamp - lastDragTime;
  if (elapsed > 0) {
    dragVelocityX = (touch.clientX - lastDragX) / elapsed;
    dragVelocityY = (touch.clientY - lastDragY) / elapsed;
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

  if (dragAxis === 'pan') {
    onPanMove(deltaX, deltaY);
    return;
  }

  const raw = dragBase + deltaX;
  const pulling = raw > 0 ? !hasPrev.value : !hasNext.value;
  dragOffset.value = pulling ? raw * EDGE_RESISTANCE : raw;
  dragMoved = true;
  showControls();
}

// Within its edges the image follows the finger, and past them it only gives
// a little. A pan that started against a side edge hands what is left of the
// drag past it to the track instead, so the next image can be pulled in
// without zooming out first. One that only runs into the edge on the way
// does not: it was moving the image, not asking for the next one.
function onPanMove(deltaX: number, deltaY: number) {
  const limits = panLimits(zoomScale.value);

  const rawX = panBaseX + deltaX;
  const clampedX = clampTo(rawX, limits.x);
  const overflowX = rawX - clampedX;
  const turning =
    overflowX > 0 ? panTurnsToPrev : overflowX < 0 && panTurnsToNext;

  if (turning) {
    zoomX.value = clampedX;
    const raw = dragBase + overflowX;
    const pulling = raw > 0 ? !hasPrev.value : !hasNext.value;
    dragOffset.value = pulling ? raw * EDGE_RESISTANCE : raw;
  } else {
    zoomX.value =
      clampedX + rubberBand(overflowX, windowWidth.value * PAN_OVERSCROLL);
    dragOffset.value = dragBase;
  }

  const rawY = panBaseY + deltaY;
  const clampedY = clampTo(rawY, limits.y);
  zoomY.value =
    clampedY + rubberBand(rawY - clampedY, windowHeight.value * PAN_OVERSCROLL);

  dragMoved = true;
}

function onPanEnd() {
  animateZoom(
    zoomTarget(
      zoomScale.value,
      zoomX.value + dragVelocityX * PAN_MOMENTUM,
      zoomY.value + dragVelocityY * PAN_MOMENTUM,
    ),
    SLIDE_DURATION,
  );
}

// A thrown track keeps the speed it was released at, so the animation carries
// the gesture on instead of restarting it.
function throwDuration(remaining: number) {
  const speed = Math.abs(dragVelocityX);
  if (speed < 0.1) return SLIDE_DURATION;
  return Math.min(
    SLIDE_DURATION,
    Math.max(MIN_SLIDE_DURATION, remaining / speed),
  );
}

function onSlideEnd(e: TouchEvent) {
  if (pinching) {
    onPinchEnd(e);
    return;
  }
  if (!dragging) return;
  dragging = false;

  // A tap leaves the track where it was, but may still have taken a running
  // slide's transition off it, so the track is handed back either way. The
  // same goes for a zoom it caught on its way back into its limits.
  if (dragAxis === 'none' || !dragMoved) {
    settleTrack(0);
    settleZoom();
    return;
  }

  dragEndedAt = Date.now();

  if (dragAxis === 'y') {
    onDismissEnd();
    return;
  }

  // What the pan pushed past the image's edge is on the track, which turns
  // the page or falls back like any other drag.
  if (dragAxis === 'pan') onPanEnd();

  const offset = dragOffset.value;
  const distance = Math.abs(offset);
  const enough =
    distance > windowWidth.value * SLIDE_DISTANCE_RATIO ||
    (Math.abs(dragVelocityX) > SLIDE_VELOCITY && distance > 10);
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
    (dragVelocityY > DISMISS_VELOCITY && pulled > DISMISS_FLICK_DISTANCE);

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
  // A swipe that caught the open halfway gives the dim back in full.
  openDim.value = 1;

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

// The tile steps out while the picture flies out of it or back into it, so the
// picture is never on screen twice in motion. At rest the tile is back in its
// slot under the viewer. Keyed by tile, because a close can still be fading one
// tile while a reopen fades another.
const tileFades = new Map<HTMLElement, Animation>();

// Picks the tile up from wherever an earlier fade left it. Without a target it
// fades back to the tile's own opacity and lets go of it.
function fadeTile(el: HTMLElement, to: number | null, duration: number) {
  const from = Number(getComputedStyle(el).opacity);
  tileFades.get(el)?.cancel();

  const fade = el.animate(
    to === null
      ? [{ offset: 0, opacity: from }]
      : [{ opacity: from }, { opacity: to }],
    { duration, easing: 'ease', fill: to === null ? 'none' : 'forwards' },
  );
  tileFades.set(el, fade);

  if (to === null) {
    void fade.finished.then(
      () => releaseTile(el, fade),
      () => {},
    );
  }
  return fade;
}

// Hands the tile straight back, unless a later fade has taken it over since.
function releaseTile(el: HTMLElement, fade: Animation) {
  if (tileFades.get(el) !== fade) return;
  tileFades.delete(el);
  fade.cancel();
}

// Every tile still stepped out, other than the one the viewer is heading for.
function restoreTiles(except: HTMLElement | null) {
  for (const el of tileFades.keys()) {
    if (el !== except) fadeTile(el, null, TILE_FADE_IN_DURATION);
  }
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

// Where the frame is on its way between the tile and full size, in its own
// units. At rest that is no offset, a scale of 1 and the frame's own corners.
interface FrameState {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  rx: number;
  ry: number;
  // The scale the picture is drawn at relative to the frame at rest, which the
  // counter scale keeps uniform.
  uniform: number;
}

function matrixOf(el: Element | null) {
  if (!el) return new DOMMatrixReadOnly();
  try {
    const transform = getComputedStyle(el).transform;
    return !transform || transform === 'none'
      ? new DOMMatrixReadOnly()
      : new DOMMatrixReadOnly(transform);
  } catch {
    return new DOMMatrixReadOnly();
  }
}

// The alpha of a computed colour: `rgba(r, g, b, a)`, `rgb(r g b / a)` or a
// plain `rgb(...)`, which is opaque.
function colorAlpha(color: string) {
  if (!color || color === 'transparent') return 0;
  const numbers = color.match(/-?[\d.]+(e-?\d+)?%?/g) ?? [];
  if (numbers.length < 4) return 1;
  const alpha = numbers[3]!;
  return alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha);
}

// Read off the screen rather than from the animation, so a close that cuts
// into the open, or into a swipe on its way back, starts exactly where the
// frame is drawn.
function frameState(frame: HTMLElement, inner: HTMLElement): FrameState {
  const f = matrixOf(frame);
  const i = matrixOf(inner);
  const radius = getComputedStyle(frame)
    .borderTopLeftRadius.split(/\s+/)
    .map((value) => parseFloat(value));
  const rx = Number.isFinite(radius[0]) ? radius[0]! : FRAME_RADIUS;
  const ry = Number.isFinite(radius[1]) ? radius[1]! : rx;

  return {
    dx: f.e,
    dy: f.f,
    sx: f.a || 1,
    sy: f.d || 1,
    rx,
    ry,
    uniform: (i.a || 1) * (f.a || 1),
  };
}

// The way into the tile, from wherever the frame is: at rest, still growing
// out of the tile, zoomed in on, or pushed away by the swipe. `frame` is the
// frame's rect with no animation on it. `ancestorScale` is what the zoom and
// the dismiss gesture left on the layers above the frame. The frame's own
// translation and corners are measured on screen but applied underneath that
// scale, so it has to be divided back out or the frame lands off its tile.
function closeKeyframes(
  tile: DOMRect,
  frame: DOMRect,
  from: FrameState,
  ancestorScale = 1,
) {
  const sx = tile.width / frame.width;
  const sy = tile.height / frame.height;
  const dx =
    (tile.left + tile.width / 2 - (frame.left + frame.width / 2)) /
    ancestorScale;
  const dy =
    (tile.top + tile.height / 2 - (frame.top + frame.height / 2)) /
    ancestorScale;
  const cover = Math.max(sx, sy);

  return {
    frame: [
      {
        transform: `translate(${from.dx}px, ${from.dy}px) scale(${from.sx}, ${from.sy})`,
        borderRadius: `${from.rx}px / ${from.ry}px`,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        borderRadius: `${THUMB_RADIUS / (sx * ancestorScale)}px / ${THUMB_RADIUS / (sy * ancestorScale)}px`,
      },
    ],
    // Sampled along the frame's path for the same reason as on the way in.
    inner: Array.from({ length: ZOOM_SAMPLES + 1 }, (_, step) => {
      const progress = step / ZOOM_SAMPLES;
      const frameX = from.sx + (sx - from.sx) * progress;
      const frameY = from.sy + (sy - from.sy) * progress;
      const uniform = from.uniform + (cover - from.uniform) * progress;

      return {
        offset: progress,
        transform: `scale(${uniform / frameX}, ${uniform / frameY})`,
      };
    }),
  };
}

// Back to the thumbnail before the frame reaches the tile, so what lands is
// the tile itself rather than an image that has to match it. Not the reverse
// of the open: that would put the crossfade in the slow tail instead of the
// fast opening stretch of the close. It starts from whatever the thumbnail
// shows right now, which after a cut short open may be anything in between.
function thumbCloseKeyframes(from: number): Keyframe[] {
  return [
    { offset: 0, opacity: from },
    { offset: CLOSE_HANDOVER, opacity: 1 },
    { offset: 1, opacity: 1 },
  ];
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

// allSettled, not all: a cancelled animation rejects its promise straight
// away, which would otherwise end the whole group while the rest still runs.
function settle(animations: Animation[], done: () => void) {
  void Promise.allSettled(
    animations.map((animation) => animation.finished),
  ).then(done);
}

function cancelAnimations(el: Element | null | undefined) {
  el?.getAnimations().forEach((animation) => animation.cancel());
}

// Once the viewer is on its way out Vue no longer patches it, so a slide or a
// swipe that was still easing back would carry on under the close and pull
// the frame off the path it was measured for. Pinned where they are drawn,
// they hold still for it.
function freezeAt(el: HTMLElement | null) {
  if (!el) return;
  const transform = getComputedStyle(el).transform;
  el.style.transition = 'none';
  el.style.transform = transform || 'none';
}

async function onEnter(el: Element, done: () => void) {
  const backdrop = el as HTMLElement;
  leaving = false;

  await nextTick();

  // Closed again before the open had even started.
  if (leaving) return;

  const parts = zoomParts(backdrop);
  const tile = parts ? originTile() : null;
  // A reopen cut the last close short, and its tile never got its landing.
  restoreTiles(tile);

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
  openDimAnimation = backdrop.animate(dimKeyframes(), options);
  const animations = [
    openDimAnimation,
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

  // What grows out of the tile is the viewer's own copy of the picture, so the
  // slot is left empty behind it.
  fadeTile(tile, 0, 0);
  zooming = true;

  settle(animations, () => {
    zooming = false;
    openDimAnimation = null;

    // A close cut the open short and has taken over from here.
    if (leaving) {
      pendingSize = null;
      done();
      return;
    }

    if (pendingSize) {
      measuredSizes.value[pendingSize.index] = {
        w: pendingSize.w,
        h: pendingSize.h,
      };
      pendingSize = null;
    }
    fadeTile(tile, null, TILE_FADE_IN_DURATION);
    // The controls are already up; this only starts the idle timer that takes
    // them away again.
    showControls();
    done();
  });
}

function onLeave(el: Element, done: () => void) {
  const backdrop = el as HTMLElement;
  leaving = true;
  zooming = false;
  openDimAnimation = null;

  if (hideTimeout) clearTimeout(hideTimeout);

  const stage = backdrop.querySelector<HTMLElement>('[data-viewer-stage]');
  const zoom = backdrop.querySelector<HTMLElement>('[data-viewer-zoom]');
  freezeAt(stage);
  freezeAt(backdrop.querySelector<HTMLElement>('[data-viewer-track]'));
  freezeAt(zoom);

  const parts = zoomParts(backdrop);
  const tile = parts ? originTile() : null;
  // An open cut short, or one that paged away, may have left a tile out.
  restoreTiles(tile);

  // Everything is picked up from where it is drawn right now, before the
  // animations that put it there are taken off. The open may still be
  // running, or a swipe may have faded the dim and moved the stage.
  const backdropStyle = getComputedStyle(backdrop);
  const dimFrom: Keyframe = {
    backgroundColor: backdropStyle.backgroundColor,
    backdropFilter: backdropStyle.backdropFilter,
    webkitBackdropFilter: backdropStyle.backdropFilter,
  };
  const opacityFrom = Number(backdropStyle.opacity);

  if (!tile || !parts) {
    // The whole backdrop fades, controls included.
    controlsVisible.value = false;
    cancelAnimations(backdrop);

    settle(
      [
        backdrop.animate([{ opacity: opacityFrom }, { opacity: 0 }], {
          duration: FADE_DURATION,
          easing: 'ease',
          fill: 'forwards',
        }),
      ],
      done,
    );
    return;
  }

  // The slot empties before the frame arrives, and the viewer's thumbnail,
  // pixel for pixel the tile, hands over to it on landing.
  const tileFade = fadeTile(tile, 0, TILE_FADE_OUT_DURATION);
  const finish = () => {
    releaseTile(tile, tileFade);
    done();
  };

  const from = frameState(parts.frame, parts.inner);
  const thumbFrom = parts.thumb
    ? Number(getComputedStyle(parts.thumb).opacity)
    : 1;
  const controlsStyle = parts.controls
    ? getComputedStyle(parts.controls)
    : null;
  const controlsFrom =
    controlsStyle && controlsStyle.display !== 'none'
      ? Number(controlsStyle.opacity)
      : 0;
  // The zoom only counts when it is on the frame that flies home, not on an
  // image a page turn is still carrying off.
  const zoomScaleFrom = zoom?.contains(parts.frame) ? matrixOf(zoom).a || 1 : 1;
  const ancestorScale = (matrixOf(stage).a || 1) * zoomScaleFrom;

  for (const part of [
    backdrop,
    parts.frame,
    parts.inner,
    parts.thumb,
    parts.controls,
  ]) {
    cancelAnimations(part);
  }

  // Held at the end state, otherwise the frame snaps back to full size for the
  // frame or two between the animation finishing and the unmount.
  const options: KeyframeAnimationOptions = {
    duration: CLOSE_DURATION,
    easing: CLOSE_EASING,
    fill: 'forwards',
  };
  // Measured with the open taken off, so this is the frame's resting rect
  // under whatever the swipe left on the stage.
  const keyframes = closeKeyframes(
    tile.getBoundingClientRect(),
    parts.frame.getBoundingClientRect(),
    from,
    ancestorScale,
  );
  const animations = [
    backdrop.animate([dimFrom, dimAt(0)], options),
    parts.frame.animate(keyframes.frame, options),
    parts.inner.animate(keyframes.inner, options),
  ];

  if (parts.thumb) {
    animations.push(
      parts.thumb.animate(thumbCloseKeyframes(thumbFrom), options),
    );
  }

  // Controls the idle timer has already taken away are gone, and fading a
  // hidden element would only hold it in the layout for nothing.
  if (parts.controls && controlsFrom > 0) {
    animations.push(
      parts.controls.animate(
        [{ opacity: controlsFrom }, { opacity: 0 }],
        options,
      ),
    );
  }

  settle(animations, finish);
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
      resetZoom();
      pinching = false;
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
  tileFades.forEach((fade) => fade.cancel());
  tileFades.clear();
  if (hideTimeout) clearTimeout(hideTimeout);
  clearSettleTimer();
  clearDismissTimer();
  clearZoomTimer();
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
              class="absolute inset-0"
              :style="slideStyle(slide.index)"
            >
              <!-- Covers the whole slide, so the zoom scales around the
                   viewport centre. -->
              <div
                :data-viewer-zoom="slide.index === zoomedIndex ? '' : null"
                class="absolute inset-0 flex items-center justify-center"
                :style="zoomStyle(slide.index)"
                @click.self="onBackdropClick"
              >
                <iframe
                  v-if="slide.image && isOfficeDocument(slide.image)"
                  :src="getOfficeViewerSrc(slide.image)"
                  class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white"
                  @click.stop
                ></iframe>
                <iframe
                  v-else-if="slide.image && isPdf(slide.image)"
                  :src="fileUrl(slide.image)"
                  class="w-[90vw] h-[85vh] max-w-5xl rounded-xl border-none bg-white"
                  @click.stop
                ></iframe>
                <!-- A layer promoted with will-change keeps the resolution it
                     was first drawn at, which would leave a zoomed in picture
                     blurry, so it is only promoted at rest. -->
                <div
                  v-else-if="slide.image && frameSize(slide.index)"
                  :data-viewer-frame="slide.index === currentIndex ? '' : null"
                  class="relative max-w-full max-h-full overflow-hidden rounded-xl"
                  :class="{ 'will-change-transform': !zoomedAt(slide.index) }"
                  :style="frameStyle(slide.index)"
                  @click.stop
                >
                  <div
                    :data-viewer-inner="
                      slide.index === currentIndex ? '' : null
                    "
                    class="absolute inset-0"
                    :class="{ 'will-change-transform': !zoomedAt(slide.index) }"
                  >
                    <img
                      :src="fileUrl(slide.image)"
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
                    :data-viewer-thumb="
                      slide.index === currentIndex ? '' : null
                    "
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
                  :src="fileUrl(slide.image)"
                  class="max-w-full max-h-full rounded-xl object-contain"
                  draggable="false"
                  alt=""
                  @click.stop
                />
              </div>
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
            class="absolute top-4 left-4 md:left-auto md:right-4 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] active:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="cancel"
          >
            <X />
          </button>

          <button
            v-if="menu"
            v-wave
            class="absolute top-4 right-4 md:hidden pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] active:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="openMenu"
          >
            <Ellipsis />
          </button>

          <!-- A pointer has no swipe, so the arrows stay on the desktop. -->
          <button
            v-if="hasPrev"
            v-wave
            class="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full hidden md:flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] active:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
            @click.stop="prev"
          >
            <ChevronLeft />
          </button>

          <button
            v-if="hasNext"
            v-wave
            class="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto bg-[rgba(0,0,0,0.6)] border-none text-white cursor-pointer p-2 rounded-full hidden md:flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.4)] active:bg-[rgba(0,0,0,0.4)] backdrop-blur-[4px]"
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
