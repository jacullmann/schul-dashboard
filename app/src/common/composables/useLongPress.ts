import { onScopeDispose } from 'vue';

export type LongPressTrigger = (event: PointerEvent | MouseEvent) => void;

export interface UseLongPressOptions {
  /** Hold duration before the menu opens on touch input. */
  delay?: number;
  /** Movement in px that reinterprets the hold as a scroll and cancels it. */
  moveThreshold?: number;
  /**
   * Selector for regions that keep their own press and right-click behaviour,
   * such as a nested menu of their own or a field the caret belongs in.
   */
  ignore?: string;
}

/** How long after the gesture ends a trailing compatibility click may arrive. */
const CLICK_SUPPRESS_WINDOW = 700;

/** A takeover this soon after touch-down is not a hold, whatever caused it. */
const MIN_HOLD_BEFORE_TAKEOVER = 300;

const CAPTURE = { capture: true } as const;
const CAPTURE_ACTIVE = { capture: true, passive: false } as const;

/**
 * Long press that reaches Safari on iOS, where a menu bound to `contextmenu`
 * alone is unreachable: WebKit never dispatches that event for a touch hold.
 *
 * Timing the hold from `pointerdown` is only half of it. WebKit also hands the
 * touch to one of its own gesture recognisers partway through a hold and
 * answers ours with `pointercancel`/`touchcancel`, so treating a cancel as
 * "gesture aborted" — the obvious reading, and the one that works everywhere
 * else — drops the very press the user is making. A cancel is only a scroll
 * when the finger actually travelled; with the finger parked it is the
 * takeover, and we honour it as the long press instead.
 *
 * The gesture is tracked on `window` rather than on the element, so a hold
 * survives the element being re-rendered or moved underneath the finger.
 *
 * Targets need the `long-press-target` utility class: without
 * `-webkit-touch-callout`/`user-select` WebKit shows its own callout over the
 * menu, and without `touch-action` the lifted finger keeps Safari's
 * double-tap-zoom delay, which outlives any click-suppression window.
 */
export function useLongPress(
  trigger: LongPressTrigger,
  options: UseLongPressOptions = {},
) {
  const { delay = 450, moveThreshold = 10, ignore } = options;

  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressTimer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | undefined;
  let source: PointerEvent | undefined;
  let pointerId: number | undefined;
  let pointerType = '';
  let startedAt = 0;
  let travelled = false;
  let openedByHold = false;
  let tracking = false;

  function isIgnored(event: Event) {
    if (!ignore) return false;

    const target = event.target as Element | null;

    return Boolean(target?.closest?.(ignore));
  }

  function stopHold() {
    if (holdTimer === undefined) return;

    clearTimeout(holdTimer);
    holdTimer = undefined;
  }

  function swallowClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    endSuppression();
  }

  function endSuppression() {
    window.removeEventListener('click', swallowClick, CAPTURE);

    if (suppressTimer === undefined) return;

    clearTimeout(suppressTimer);
    suppressTimer = undefined;
  }

  /**
   * The menu is open, so the click the lifted finger still produces must reach
   * nothing: it would re-select the card underneath, or dismiss the menu by
   * landing on its own backdrop.
   */
  function startSuppression() {
    window.addEventListener('click', swallowClick, CAPTURE);
    suppressTimer = setTimeout(endSuppression, CLICK_SUPPRESS_WINDOW);
  }

  function fire() {
    stopHold();

    if (openedByHold || !source) return;

    openedByHold = true;
    trigger(source);
  }

  function onWindowPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId || !origin) return;

    const distance = Math.hypot(
      event.clientX - origin.x,
      event.clientY - origin.y,
    );

    if (distance <= moveThreshold) return;

    travelled = true;
    stopHold();
  }

  function onWindowPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;

    stopHold();

    // A touch ends on `touchend`, one event later, where the compatibility
    // click it is about to synthesise can still be cancelled.
    if (pointerType !== 'touch') stopTracking();
  }

  function onWindowPointerCancel(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;

    onTakeover();
  }

  function onWindowTouchStart(event: TouchEvent) {
    // A second finger is a pinch or a two-finger scroll, never a hold.
    if (event.touches.length > 1) {
      travelled = true;
      stopHold();
    }
  }

  function onWindowTouchEnd(event: TouchEvent) {
    // Cancelling the touch's default action is what stops WebKit from
    // synthesising the trailing mouse events in the first place; the click
    // swallow below only covers browsers that synthesise them anyway.
    if (openedByHold && event.cancelable) event.preventDefault();

    if (event.touches.length === 0) stopTracking();
  }

  function onWindowTouchCancel(event: TouchEvent) {
    if (event.touches.length > 0) return;

    onTakeover();
  }

  /** The user agent claimed the gesture for a recogniser of its own. */
  function onTakeover() {
    const held = Date.now() - startedAt;
    const wasHolding =
      holdTimer !== undefined && !travelled && held >= MIN_HOLD_BEFORE_TAKEOVER;

    if (wasHolding) fire();

    stopTracking();
  }

  function onWindowScroll() {
    travelled = true;
    stopHold();
  }

  function startTracking(event: PointerEvent) {
    tracking = true;
    pointerId = event.pointerId;
    pointerType = event.pointerType;
    origin = { x: event.clientX, y: event.clientY };
    source = event;
    startedAt = Date.now();
    travelled = false;

    window.addEventListener('touchstart', onWindowTouchStart, CAPTURE);
    window.addEventListener('pointermove', onWindowPointerMove, CAPTURE);
    window.addEventListener('pointerup', onWindowPointerUp, CAPTURE);
    window.addEventListener('pointercancel', onWindowPointerCancel, CAPTURE);
    window.addEventListener('touchend', onWindowTouchEnd, CAPTURE_ACTIVE);
    window.addEventListener('touchcancel', onWindowTouchCancel, CAPTURE);
    window.addEventListener('scroll', onWindowScroll, CAPTURE);
  }

  function stopTracking() {
    stopHold();

    if (!tracking) return;

    tracking = false;
    pointerId = undefined;
    pointerType = '';
    origin = undefined;
    source = undefined;

    window.removeEventListener('touchstart', onWindowTouchStart, CAPTURE);
    window.removeEventListener('pointermove', onWindowPointerMove, CAPTURE);
    window.removeEventListener('pointerup', onWindowPointerUp, CAPTURE);
    window.removeEventListener('pointercancel', onWindowPointerCancel, CAPTURE);
    window.removeEventListener('touchend', onWindowTouchEnd, CAPTURE_ACTIVE);
    window.removeEventListener('touchcancel', onWindowTouchCancel, CAPTURE);
    window.removeEventListener('scroll', onWindowScroll, CAPTURE);

    if (openedByHold) startSuppression();
  }

  function onPointerDown(event: PointerEvent) {
    openedByHold = false;
    stopTracking();
    endSuppression();

    if (isIgnored(event)) return;

    // A second finger is a pinch or a scroll, never a hold.
    if (!event.isPrimary) return;

    // A mouse gets its menu from the native contextmenu event.
    if (event.pointerType === 'mouse') return;

    startTracking(event);
    holdTimer = setTimeout(fire, delay);
  }

  function onContextMenu(event: MouseEvent) {
    if (isIgnored(event)) return;

    // Android fires this on top of the hold we already handled; iOS never
    // fires it for touch at all. Either way the native menu stays closed.
    event.preventDefault();
    event.stopPropagation();
    stopHold();

    if (openedByHold) return;

    // It beat the hold to it, and the finger still owes a trailing click.
    if (tracking) openedByHold = true;

    trigger(event);
  }

  onScopeDispose(() => {
    stopTracking();
    endSuppression();
  });

  return {
    handlers: {
      pointerdown: onPointerDown,
      contextmenu: onContextMenu,
    },
  };
}
