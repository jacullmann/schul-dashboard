<script lang="ts">
export interface NavItem {
  id: string;
  label: string;
}

/**
 * A spring tuned the way designers describe one: `response` is how long one
 * swing takes in seconds, `dampingRatio` how much of the swing survives. At 1
 * it settles without overshooting; just below 1 it overshoots a hair and
 * settles, which is what lets motion read as a physical object.
 */
interface SpringConfig {
  response: number;
  dampingRatio: number;
}

/** Tapping or arrowing to a tab: straight there, without overshooting. */
const SELECT: SpringConfig = { response: 0.34, dampingRatio: 1 };
/** Letting go of the pill, which carries the speed it was thrown with. */
const RELEASE: SpringConfig = { response: 0.36, dampingRatio: 0.88 };
/** The pill gliding over to a finger that picked it up from another tab. */
const CATCH_UP: SpringConfig = { response: 0.28, dampingRatio: 1 };
/** The pill giving way under a finger that holds it. */
const PRESS: SpringConfig = { response: 0.22, dampingRatio: 1 };

/** How far the held pill draws in from every side, in px. */
const PRESS_INSET = 2;
/** How long a touch rests before the pill gives way, so a scroll never flashes it. */
const PRESS_DELAY = 80;
const TOUCH_SLOP = 8;
const MOUSE_SLOP = 5;
/**
 * How far ahead a release's momentum is projected when picking the tab it
 * lands on, in seconds: the reach of UIScrollView's fast deceleration.
 */
const PROJECTION = 0.1;
const MAX_SPEED = 4000;
const VELOCITY_WINDOW = 100;
/** The most the pill can be pushed past the first or last tab, in px. */
const OVERDRAG_LIMIT = 12;
const AUTOSCROLL_EDGE = 40;
const AUTOSCROLL_SPEED = 900;
/** How long after a drag the click its pointer may still produce is swallowed. */
const CLICK_SUPPRESS_WINDOW = 400;
/** Closer than this, in px and px/s, a motion is over. */
const REST_DISTANCE = 0.05;
const REST_SPEED = 1;

const CAPTURE = { capture: true } as const;
const CAPTURE_ACTIVE = { capture: true, passive: false } as const;

/**
 * A damped spring solved in closed form instead of stepped frame by frame, so
 * its state is a function of the clock alone. A frame lost to a busy main
 * thread skips ahead rather than stretching the motion out, and retargeting
 * mid-flight starts from the exact position and velocity of that instant, so
 * an interrupted motion bends smoothly instead of restarting a curve.
 */
class Spring {
  private from = 0;
  private velocity = 0;
  private target = 0;
  private start = 0;
  private config: SpringConfig;

  constructor(config: SpringConfig) {
    this.config = config;
  }

  /** Position and velocity (per second) at `time` on the performance clock. */
  sample(time: number): [position: number, velocity: number] {
    const offset = this.from - this.target;
    const speed = this.velocity;
    if (offset === 0 && speed === 0) return [this.target, 0];

    const { response, dampingRatio } = this.config;
    const omega = (2 * Math.PI) / response;
    const t = Math.max(0, time - this.start) / 1000;

    if (dampingRatio < 1) {
      const decay = dampingRatio * omega;
      const frequency = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
      const swing = (speed + decay * offset) / frequency;
      const envelope = Math.exp(-decay * t);
      const cos = Math.cos(frequency * t);
      const sin = Math.sin(frequency * t);

      return [
        this.target + envelope * (offset * cos + swing * sin),
        envelope *
          ((swing * frequency - decay * offset) * cos -
            (offset * frequency + decay * swing) * sin),
      ];
    }

    const drift = speed + omega * offset;
    const envelope = Math.exp(-omega * t);

    return [
      this.target + (offset + drift * t) * envelope,
      (speed - omega * drift * t) * envelope,
    ];
  }

  /** Sets off from `position` at `velocity` towards `target`. */
  launch(
    position: number,
    velocity: number,
    target: number,
    time: number,
    config = this.config,
  ) {
    this.from = position;
    this.velocity = velocity;
    this.target = target;
    this.start = time;
    this.config = config;
  }

  /** Heads somewhere new from wherever the motion is at `time`, keeping its momentum. */
  retarget(target: number, time: number, config = this.config) {
    const [position, velocity] = this.sample(time);
    this.launch(position, velocity, target, time, config);
  }

  /** Puts the spring at rest on `position`. */
  jump(position: number) {
    this.launch(position, 0, position, 0);
  }

  /** The position at `time`, ending the motion on target once it is too close to see. */
  settle(time: number): [position: number, moving: boolean] {
    const [position, velocity] = this.sample(time);
    const resting =
      Math.abs(position - this.target) < REST_DISTANCE &&
      Math.abs(velocity) < REST_SPEED;

    if (!resting) return [position, true];

    this.jump(this.target);
    return [this.target, false];
  }
}

/** Where each tab sits along the row, in layout px. */
interface Metrics {
  lefts: number[];
  rights: number[];
  centers: number[];
  /** The row's height: the narrowest the pill is ever squeezed to. */
  height: number;
}

interface Sample {
  time: number;
  /** The pointer, as a distance along the row. */
  x: number;
}

interface Gesture {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  clientX: number;
  /** Where across the pill the press landed, from 0 to 1; null beside it. */
  grip: number | null;
  /**
   * The point on every tab that the finger holds the pill by, as a distance
   * along the row. Set once the press has travelled far enough to be a drag.
   */
  stops: number[] | null;
  /** How far the pill still trails the finger, closing as it catches up. */
  lag: Spring;
  samples: Sample[];
  /** Where the row is being scrolled to, kept fractional. */
  scroll: number;
  pressTimer: ReturnType<typeof setTimeout> | undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * How far along the ascending `stops` the value `x` lies, counted in stops:
 * 1.5 is halfway between the second and the third. Past either end the
 * nearest segment carries on.
 */
function progressAlong(stops: readonly number[], x: number) {
  const last = stops.length - 1;
  if (last < 1) return 0;

  let index = 0;
  while (index < last - 1 && x >= stops[index + 1]!) index++;

  const from = stops[index]!;
  return index + (x - from) / (stops[index + 1]! - from);
}

/** The value `progress` stops along the ascending `stops`; undoes `progressAlong`. */
function valueAlong(stops: readonly number[], progress: number) {
  const last = stops.length - 1;
  if (last < 1) return stops[0] ?? 0;

  const index = clamp(Math.floor(progress), 0, last - 1);
  const from = stops[index]!;
  return from + (stops[index + 1]! - from) * (progress - index);
}

/** Resistance that grows the further something is pushed past where it may go. */
function rubberBand(distance: number, limit: number) {
  return limit * (1 - 1 / ((distance * 0.55) / limit + 1));
}

/** Keeps a pill centre over the tabs, giving way ever more reluctantly past the ends. */
function resist(metrics: Metrics, center: number) {
  const first = metrics.centers[0]!;
  const last = metrics.centers[metrics.centers.length - 1]!;

  if (center < first) return first - rubberBand(first - center, OVERDRAG_LIMIT);
  if (center > last) return last + rubberBand(center - last, OVERDRAG_LIMIT);
  return center;
}

/**
 * The pill's edges for a centre anywhere along the row. Between two tabs both
 * edges travel in step from one tab's edges to the other's, so the pill
 * reshapes continuously on its way. Pushed past the first or last tab, its
 * outer edge stays against the wall and the pill is squeezed instead.
 */
function pillEdges(metrics: Metrics, center: number): [number, number] {
  const { lefts, rights, centers, height } = metrics;
  const last = centers.length - 1;
  const first = centers[0]!;
  const final = centers[last]!;

  if (center < first) {
    const left = lefts[0]!;
    const right = rights[0]!;
    const narrowest = Math.min(height, right - left);
    return [left, Math.max(right - 2 * (first - center), left + narrowest)];
  }

  if (center > final) {
    const left = lefts[last]!;
    const right = rights[last]!;
    const narrowest = Math.min(height, right - left);
    return [Math.min(left + 2 * (center - final), right - narrowest), right];
  }

  const progress = progressAlong(centers, center);
  return [valueAlong(lefts, progress), valueAlong(rights, progress)];
}

/** The tab under `x`, or the nearest one past either end. */
function tabAt(metrics: Metrics, x: number) {
  const index = metrics.rights.findIndex((right) => x < right);
  return index === -1 ? metrics.rights.length - 1 : index;
}

/**
 * The tab a released pill lands on: the one nearest to where its momentum
 * would carry it, but never more than one past the tab it was let go over.
 */
function landingIndex(metrics: Metrics, center: number, speed: number) {
  const last = metrics.centers.length - 1;
  const here = clamp(
    Math.round(progressAlong(metrics.centers, center)),
    0,
    last,
  );
  const ahead = Math.round(
    progressAlong(metrics.centers, center + speed * PROJECTION),
  );

  return clamp(ahead, Math.max(here - 1, 0), Math.min(here + 1, last));
}

/**
 * Speed through the recent samples once `toPosition` has placed them, per
 * second. Fitted to all of them, so one jittery sample can't spike it, and a
 * finger that stopped before lifting leaves nothing recent enough to count.
 */
function speedOf(
  samples: readonly Sample[],
  now: number,
  toPosition: (x: number) => number,
) {
  const recent = samples
    .filter((sample) => now - sample.time <= VELOCITY_WINDOW)
    .map((sample) => ({ time: sample.time, position: toPosition(sample.x) }));
  if (recent.length < 2) return 0;

  const meanTime =
    recent.reduce((sum, sample) => sum + sample.time, 0) / recent.length;
  const meanPosition =
    recent.reduce((sum, sample) => sum + sample.position, 0) / recent.length;

  let covariance = 0;
  let variance = 0;
  for (const { time, position } of recent) {
    covariance += (time - meanTime) * (position - meanPosition);
    variance += (time - meanTime) ** 2;
  }

  return variance > 0 ? (covariance / variance) * 1000 : 0;
}

/** A length for inline CSS, rounded so it never serialises in exponent notation. */
function px(value: number) {
  return `${Math.round(value * 100) / 100}px`;
}
</script>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';

const props = withDefaults(
  defineProps<{
    items: NavItem[];
    activeId: string;
  }>(),
  {
    items: () => [],
    activeId: '',
  },
);

const emit = defineEmits<{
  (e: 'change', id: string): void;
}>();

const groupName = useId();
const reducedMotion = usePreferredReducedMotion();

const containerRef = ref<HTMLElement | null>(null);
const barRef = ref<HTMLElement | null>(null);
const rowRef = ref<HTMLElement | null>(null);
const tabsRef = ref<HTMLElement | null>(null);
const pillRef = ref<HTMLElement | null>(null);

const isStretched = ref(false);
const isScrollable = ref(false);
const isDragging = ref(false);

const activeIndex = computed(() =>
  props.items.findIndex((item) => item.id === props.activeId),
);
const structure = computed(() => props.items.map((item) => item.id).join('\n'));

/** Shared by the tabs and their copies inside the pill, which must lay out identically. */
const tabClass = computed(() => [
  'flex min-h-9 min-w-9 shrink-0 items-center whitespace-nowrap px-5 py-2 text-sm/4 font-medium',
  isStretched.value && 'grow justify-center',
]);

// The pill lives outside Vue's reactivity: it changes every frame, and all it
// ever touches is one style property.
const pill = new Spring(SELECT);
const press = new Spring(PRESS);

let metrics: Metrics | null = null;
/** The tab the pill rests on or is heading for; -1 while there is none. */
let targetIndex = activeIndex.value;
let pillShown = false;
let paintedClip = '';
let frameId = 0;
let lastFrame = 0;
let gesture: Gesture | null = null;
let suppressClicksUntil = 0;
let observer: ResizeObserver | null = null;

function reduceMotion() {
  return reducedMotion.value === 'reduce';
}

/**
 * Horizontal pans on a tab belong to the pill. In a row that scrolls, only the
 * tab the pill rests on keeps them; everywhere else the row scrolls natively.
 */
function touchAction(index: number) {
  return isScrollable.value && index !== activeIndex.value
    ? 'touch-manipulation'
    : 'touch-pan-y touch-pinch-zoom';
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function tabElements() {
  return Array.from(tabsRef.value?.children ?? []) as HTMLElement[];
}

/**
 * Reads where every tab sits along the row. Layout offsets ignore transforms,
 * so a modal that is still scaling in reports its settled geometry.
 */
function measure(): Metrics | null {
  const row = rowRef.value;
  const tabs = tabElements();
  if (!row || tabs.length === 0 || tabs.length !== props.items.length) {
    return null;
  }

  const lefts: number[] = [];
  const rights: number[] = [];
  const centers: number[] = [];

  for (const tab of tabs) {
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    const center = (left + right) / 2;

    // Hidden or not laid out yet; the resize that follows brings real numbers.
    if (right <= left || center <= (centers.at(-1) ?? -Infinity)) return null;

    lefts.push(left);
    rights.push(right);
    centers.push(center);
  }

  return { lefts, rights, centers, height: row.offsetHeight };
}

/** Tabs that would take up more than half of the available width stretch to fill it. */
function updateStretch() {
  const available = containerRef.value?.clientWidth ?? 0;
  const tabs = tabElements();
  if (available <= 0 || tabs.length === 0) return false;

  let natural = 0;
  for (const tab of tabs) {
    const { paddingLeft, paddingRight } = getComputedStyle(tab);
    const label = tab.lastElementChild as HTMLElement | null;
    natural +=
      (label?.offsetWidth ?? 0) +
      parseFloat(paddingLeft) +
      parseFloat(paddingRight);
  }

  const stretched = natural > available / 2;
  if (stretched === isStretched.value) return false;

  isStretched.value = stretched;
  return true;
}

/**
 * Re-reads the layout and carries the pill over to it. A pill in flight keeps
 * its place among the tabs and its speed, so a reflow — a page scrollbar
 * appearing as the content below changes, a web font finishing loading —
 * never shows as a jump or as an animation starting over.
 */
function refresh() {
  const bar = barRef.value;
  if (bar) isScrollable.value = bar.scrollWidth - bar.clientWidth > 1;

  const next = measure();
  if (!next) return;

  const previous = metrics;
  metrics = next;

  const target = next.centers[targetIndex];
  if (target === undefined) {
    hidePill();
    return;
  }

  const now = performance.now();
  if (pillShown && previous?.centers.length === next.centers.length) {
    const [position, velocity] = pill.sample(now);
    const progress = progressAlong(previous.centers, position);
    pill.launch(valueAlong(next.centers, progress), velocity, target, now);
  } else {
    pill.jump(target);
    pillShown = true;
  }

  render(now);
  schedule();
}

function onResize() {
  // Stretching reflows the tabs, so measure once Vue has applied it.
  if (updateStretch()) void nextTick(refresh);
  else refresh();
}

function observe() {
  if (!observer) return;

  observer.disconnect();
  for (const el of [containerRef.value, barRef.value, ...tabElements()]) {
    if (el) observer.observe(el);
  }
}

/** Scrolls an overflowing row, and nothing around it, to centre a tab. */
function reveal(index: number, smooth: boolean) {
  const bar = barRef.value;
  const left = metrics?.lefts[index];
  const right = metrics?.rights[index];
  if (!bar || left === undefined || right === undefined) return;

  const max = bar.scrollWidth - bar.clientWidth;
  if (max <= 0) return;

  bar.scrollTo({
    left: clamp((left + right - bar.clientWidth) / 2, 0, max),
    behavior: smooth && !reduceMotion() ? 'smooth' : 'auto',
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function schedule() {
  if (!frameId) frameId = requestAnimationFrame(frame);
}

function frame(now: number) {
  frameId = 0;

  const m = metrics;
  if (!m || !pillShown) {
    lastFrame = 0;
    return;
  }

  const elapsed = lastFrame ? Math.min(now - lastFrame, 100) / 1000 : 0;
  lastFrame = now;

  const g = gesture;
  let center: number;
  let moving = true;

  if (g?.stops) {
    autoscroll(g, elapsed, now);
    center = dragCenter(g, g.stops, m, now);
  } else {
    [center, moving] = pill.settle(now);
  }

  const [inset, pressing] = press.settle(now);
  paint(m, center, inset);

  if (moving || pressing) schedule();
  else lastFrame = 0;
}

function render(now: number) {
  const m = metrics;
  if (!m || !pillShown) return;

  const center = gesture?.stops
    ? dragCenter(gesture, gesture.stops, m, now)
    : pill.sample(now)[0];

  paint(m, center, press.sample(now)[0]);
}

/**
 * Draws the pill by clipping a copy of the row, set in the active colours, to
 * the pill's shape. The labels in the copy sit exactly on top of the real ones
 * and never move, so they can't shimmer or drift out of line the way
 * counter-translated text does, and a clip only repaints: nothing is laid out
 * again while the pill moves.
 */
function paint(m: Metrics, center: number, inset: number) {
  const el = pillRef.value;
  if (!el) return;

  const [left, right] = pillEdges(m, center);
  const clip = `inset(${px(inset)} calc(100% - ${px(right - inset)}) ${px(inset)} ${px(left + inset)} round 9999px)`;
  if (clip === paintedClip) return;

  paintedClip = clip;
  el.style.clipPath = clip;
}

function hidePill() {
  pillShown = false;
  paintedClip = '';
  pillRef.value?.style.removeProperty('clip-path');
}

// ─── Selection ───────────────────────────────────────────────────────────────

/** Sends the pill to a tab. Interrupting a motion keeps its momentum. */
function moveTo(index: number) {
  targetIndex = index;

  const target = metrics?.centers[index];
  if (target === undefined) return;

  if (pillShown && !reduceMotion()) {
    pill.retarget(target, performance.now(), SELECT);
  } else {
    pill.jump(target);
    pillShown = true;
  }

  reveal(index, true);
  schedule();
}

function commit(index: number) {
  const item = props.items[index];
  if (item && item.id !== props.activeId) emit('change', item.id);
}

function onChange(index: number) {
  moveTo(index);
  commit(index);
}

// ─── Dragging ────────────────────────────────────────────────────────────────

/** A viewport x as a distance along the row, with scroll and any scaling undone. */
function rowX(clientX: number) {
  const row = rowRef.value;
  if (!row) return 0;

  const rect = row.getBoundingClientRect();
  const scale = row.offsetWidth > 0 ? rect.width / row.offsetWidth : 1;
  return (clientX - rect.left) / (Math.abs(scale - 1) < 0.01 ? 1 : scale);
}

/** The pill centre that puts the point it is held by under `x`. */
function follow(stops: readonly number[], m: Metrics, x: number) {
  return valueAlong(m.centers, progressAlong(stops, x));
}

/** The held pill: under the finger, less however far it is still catching up. */
function dragCenter(
  g: Gesture,
  stops: readonly number[],
  m: Metrics,
  time: number,
) {
  return resist(m, follow(stops, m, rowX(g.clientX)) + g.lag.sample(time)[0]);
}

function record(g: Gesture, time: number) {
  g.samples.push({ time, x: rowX(g.clientX) });

  while (g.samples.length > 2 && time - g.samples[0]!.time > VELOCITY_WINDOW) {
    g.samples.shift();
  }
}

function setPressed(pressed: boolean) {
  if (reduceMotion()) press.jump(0);
  else press.retarget(pressed ? PRESS_INSET : 0, performance.now());

  schedule();
}

function onPointerDown(event: PointerEvent) {
  // A new press owns whatever click comes next.
  suppressClicksUntil = 0;

  const m = metrics;
  if (gesture || !m || !pillShown || m.centers.length < 2) return;
  if (!event.isPrimary || event.button !== 0) return;

  const now = performance.now();
  const [left, right] = pillEdges(m, pill.sample(now)[0]);
  const x = rowX(event.clientX);
  const onPill = x >= left && x <= right;

  // In a row that scrolls, a finger landing beside the pill is scrolling it.
  if (event.pointerType !== 'mouse' && isScrollable.value && !onPill) return;

  const g: Gesture = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    startX: event.clientX,
    startY: event.clientY,
    clientX: event.clientX,
    grip: onPill ? (right > left ? (x - left) / (right - left) : 0.5) : null,
    stops: null,
    lag: new Spring(CATCH_UP),
    samples: [],
    scroll: 0,
    pressTimer: undefined,
  };
  gesture = g;
  record(g, now);

  if (onPill) {
    if (event.pointerType === 'mouse') setPressed(true);
    else g.pressTimer = setTimeout(() => setPressed(true), PRESS_DELAY);
  }

  window.addEventListener('pointermove', onPointerMove, CAPTURE);
  window.addEventListener('pointerup', onPointerUp, CAPTURE);
  window.addEventListener('pointercancel', onPointerCancel, CAPTURE);
  window.addEventListener('touchmove', onTouchMove, CAPTURE_ACTIVE);
  window.addEventListener('keydown', onKeyDown, CAPTURE);
  window.addEventListener('blur', onBlur);
}

function onPointerMove(event: PointerEvent) {
  const g = gesture;
  if (!g || event.pointerId !== g.pointerId) return;

  g.clientX = event.clientX;
  const now = performance.now();

  if (!g.stops) {
    const dx = Math.abs(event.clientX - g.startX);
    const dy = Math.abs(event.clientY - g.startY);
    const isMouse = g.pointerType === 'mouse';

    if (isMouse ? dx < MOUSE_SLOP : Math.hypot(dx, dy) < TOUCH_SLOP) {
      record(g, now);
      return;
    }

    // Mostly vertical is the page scrolling, and the browser takes it from here.
    if (!isMouse && dy > dx) {
      end(true);
      return;
    }

    pickUp(g, now);
  }

  record(g, now);
  schedule();
}

/**
 * Turns a press into a drag. A finger on the pill holds it right where it
 * pressed, and the few px it travelled before counting as a drag close up
 * smoothly instead of as a jump. A finger on another tab holds the pill where
 * it touches that tab, and the pill glides over from wherever it was, at the
 * speed it already had.
 */
function pickUp(g: Gesture, now: number) {
  const m = metrics;
  const bar = barRef.value;
  if (!m || !bar) {
    end(true);
    return;
  }

  const x = rowX(g.clientX);
  const [center, velocity] = pill.sample(now);

  const tab = tabAt(m, x);
  const tabLeft = m.lefts[tab]!;
  const grip =
    g.grip ?? clamp((x - tabLeft) / (m.rights[tab]! - tabLeft), 0, 1);

  const stops = m.lefts.map(
    (left, index) => left + grip * (m.rights[index]! - left),
  );
  const lag = center - follow(stops, m, x);

  if (reduceMotion()) {
    g.lag.jump(0);
  } else if (g.grip !== null) {
    g.lag.launch(lag, 0, 0, now);
  } else {
    // Taking the finger's own speed out keeps the pill's velocity continuous.
    const fingerSpeed = speedOf(g.samples, now, (sampleX) =>
      follow(stops, m, sampleX),
    );
    g.lag.launch(lag, velocity - fingerSpeed, 0, now);
  }

  g.stops = stops;
  g.scroll = bar.scrollLeft;
  clearTimeout(g.pressTimer);
  setPressed(true);
  isDragging.value = true;

  try {
    bar.setPointerCapture(g.pointerId);
  } catch {
    // The pointer is already gone; its pointerup or cancel still ends the drag.
  }
}

function onPointerUp(event: PointerEvent) {
  const g = gesture;
  if (!g || event.pointerId !== g.pointerId) return;

  g.clientX = event.clientX;
  record(g, performance.now());
  end(false);
}

function onPointerCancel(event: PointerEvent) {
  if (gesture && event.pointerId === gesture.pointerId) end(true);
}

/** Once the pill is held, the page must not scroll out from under it. */
function onTouchMove(event: TouchEvent) {
  if (gesture?.stops && event.cancelable) event.preventDefault();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !gesture?.stops) return;

  // Puts the pill back, without also closing a modal the tabs sit in.
  event.preventDefault();
  event.stopPropagation();
  end(true);
}

function onBlur() {
  end(true);
}

function end(cancelled: boolean) {
  const g = gesture;
  if (!g) return;

  gesture = null;
  window.removeEventListener('pointermove', onPointerMove, CAPTURE);
  window.removeEventListener('pointerup', onPointerUp, CAPTURE);
  window.removeEventListener('pointercancel', onPointerCancel, CAPTURE);
  window.removeEventListener('touchmove', onTouchMove, CAPTURE_ACTIVE);
  window.removeEventListener('keydown', onKeyDown, CAPTURE);
  window.removeEventListener('blur', onBlur);

  clearTimeout(g.pressTimer);
  setPressed(false);

  if (!g.stops) return;

  isDragging.value = false;
  suppressClicksUntil = performance.now() + CLICK_SUPPRESS_WINDOW;

  const bar = barRef.value;
  if (bar?.hasPointerCapture(g.pointerId)) {
    bar.releasePointerCapture(g.pointerId);
  }

  release(g, g.stops, cancelled);
}

/**
 * Lets go of the pill. It lands on the tab its momentum points at and springs
 * there from exactly where it is, at exactly the speed it is going, so the
 * hand-off from finger to spring never shows.
 */
function release(g: Gesture, stops: readonly number[], cancelled: boolean) {
  const m = metrics;
  if (!m) return;

  const now = performance.now();
  const reach = follow(stops, m, rowX(g.clientX));
  const speed = clamp(
    speedOf(g.samples, now, (x) => follow(stops, m, x)),
    -MAX_SPEED,
    MAX_SPEED,
  );

  // On screen the pill may still be catching up, or giving way at an end, so
  // its real speed is measured across the next millisecond.
  const center = resist(m, reach + g.lag.sample(now)[0]);
  const ahead = resist(m, reach + speed / 1000 + g.lag.sample(now + 1)[0]);
  const velocity = clamp((ahead - center) * 1000, -MAX_SPEED, MAX_SPEED);

  const index = cancelled
    ? targetIndex
    : landingIndex(m, resist(m, reach), speed);
  const target = m.centers[index];
  if (target === undefined) return;

  targetIndex = index;
  if (reduceMotion()) pill.jump(target);
  else pill.launch(center, velocity, target, now, RELEASE);
  schedule();

  if (cancelled) return;

  // What a tap would have done to the radio.
  const input = tabElements()[index]?.querySelector('input');
  if (input) input.checked = true;

  reveal(index, true);
  commit(index);
}

/** Scrolls an overflowing row while the dragging finger pushes into one of its ends. */
function autoscroll(g: Gesture, elapsed: number, now: number) {
  const bar = barRef.value;
  if (!bar || elapsed === 0) return;

  const max = bar.scrollWidth - bar.clientWidth;
  if (max <= 0) return;

  const { left, right, width } = bar.getBoundingClientRect();
  const edge = Math.min(AUTOSCROLL_EDGE, width / 4);

  let push = 0;
  if (g.clientX < left + edge && g.clientX < g.startX) {
    push = -Math.min(1, (left + edge - g.clientX) / edge);
  } else if (g.clientX > right - edge && g.clientX > g.startX) {
    push = Math.min(1, (g.clientX - right + edge) / edge);
  }
  if (push === 0) return;

  // Browsers may round what they are given, so the exact position lives here.
  if (Math.abs(bar.scrollLeft - g.scroll) > 1) g.scroll = bar.scrollLeft;

  const scroll = clamp(
    g.scroll + push * Math.abs(push) * AUTOSCROLL_SPEED * elapsed,
    0,
    max,
  );
  if (scroll === g.scroll) return;

  g.scroll = scroll;
  bar.scrollLeft = scroll;
  record(g, now);
}

/** The click a drag's pointer may still produce must not pick the tab it ended on. */
function onClickCapture(event: MouseEvent) {
  if (performance.now() > suppressClicksUntil) return;

  suppressClicksUntil = 0;
  event.preventDefault();
  event.stopPropagation();
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

watch(
  [structure, activeIndex],
  ([key, index], [previousKey]) => {
    if (key !== previousKey) {
      // Different tabs: whatever the pill was doing belonged to the old ones.
      end(true);
      targetIndex = index;
      metrics = null;
      pillShown = false;
      observe();
      onResize();
      void nextTick(() => reveal(targetIndex, false));
      return;
    }

    if (index === targetIndex) return;

    if (index === -1) {
      end(true);
      targetIndex = -1;
      hidePill();
    } else if (gesture?.stops) {
      // The drag decides where the pill goes; if it is cancelled, it goes here.
      targetIndex = index;
    } else {
      moveTo(index);
    }
  },
  { flush: 'post' },
);

onMounted(() => {
  observer = new ResizeObserver(onResize);
  observe();
  onResize();
  void nextTick(() => reveal(targetIndex, false));
});

onBeforeUnmount(() => {
  end(true);
  observer?.disconnect();
  observer = null;
  cancelAnimationFrame(frameId);
  frameId = 0;
});
</script>

<template>
  <div ref="containerRef" class="flex w-full items-center justify-start">
    <div
      ref="barRef"
      class="relative isolate flex max-w-full overflow-x-auto overflow-y-hidden rounded-full border border-ghost-border bg-surface shadow-input scrollbar-hide select-none [-webkit-touch-callout:none] has-focus-visible:ring-2 has-focus-visible:ring-focus"
      :class="[
        isStretched ? 'w-full' : 'w-max',
        isDragging && 'cursor-grabbing **:cursor-grabbing',
      ]"
      @pointerdown="onPointerDown"
      @click.capture="onClickCapture"
    >
      <div
        ref="rowRef"
        role="radiogroup"
        class="relative grid"
        :class="isStretched ? 'w-full min-w-max' : 'w-max'"
      >
        <div ref="tabsRef" class="col-start-1 row-start-1 flex">
          <label
            v-for="(item, index) in items"
            :key="item.id"
            class="relative cursor-pointer text-on-ghost-muted transition-hover hover:text-on-ghost touch-target after:min-h-12 after:min-w-12"
            :class="[tabClass, touchAction(index)]"
          >
            <input
              type="radio"
              class="sr-only"
              :name="groupName"
              :value="item.id"
              :checked="item.id === activeId"
              @change="onChange(index)"
            />
            <span>{{ item.label }}</span>
          </label>
        </div>

        <!-- The pill: the same row in the active colours, clipped to its shape -->
        <div
          ref="pillRef"
          class="pointer-events-none relative z-1 col-start-1 row-start-1 flex bg-action text-on-action [clip-path:inset(0_100%_0_0)] forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:forced-color-adjust-none"
          aria-hidden="true"
        >
          <span v-for="item in items" :key="item.id" :class="tabClass">
            <span>{{ item.label }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
