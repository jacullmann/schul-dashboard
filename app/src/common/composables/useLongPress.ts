import { onScopeDispose } from 'vue';

export type LongPressTrigger = (event: PointerEvent | MouseEvent) => void;

export interface UseLongPressOptions {
  /** Hold duration before the menu opens on touch input. */
  delay?: number;
  /** Movement in px that reinterprets the hold as a scroll and cancels it. */
  moveThreshold?: number;
}

/** How long after the finger lifts a trailing click may still arrive. */
const CLICK_SWALLOW_WINDOW = 300;

/**
 * Safari on iOS never dispatches `contextmenu` for a touch hold, so a menu
 * bound to that event alone is unreachable there. Pairing the native event
 * with a pointer-driven hold covers every input model, and the shared state
 * keeps browsers that emit both (Android) from opening the menu twice.
 */
export function useLongPress(
  trigger: LongPressTrigger,
  options: UseLongPressOptions = {},
) {
  const { delay = 450, moveThreshold = 10 } = options;

  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let swallowTimer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | undefined;
  let openedByHold = false;

  function stopHold() {
    if (holdTimer === undefined) return;

    clearTimeout(holdTimer);
    holdTimer = undefined;
  }

  function swallowClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    disarmClickSwallow();
  }

  function disarmClickSwallow() {
    window.removeEventListener('click', swallowClick, true);

    if (swallowTimer === undefined) return;

    clearTimeout(swallowTimer);
    swallowTimer = undefined;
  }

  function armClickSwallow() {
    window.addEventListener('click', swallowClick, true);
    swallowTimer = setTimeout(disarmClickSwallow, CLICK_SWALLOW_WINDOW);
  }

  function onPointerDown(event: PointerEvent) {
    disarmClickSwallow();
    openedByHold = false;

    // A mouse gets its menu from the native contextmenu event.
    if (event.pointerType === 'mouse') return;

    origin = { x: event.clientX, y: event.clientY };
    holdTimer = setTimeout(() => {
      holdTimer = undefined;
      openedByHold = true;
      trigger(event);
    }, delay);
  }

  function onPointerMove(event: PointerEvent) {
    if (holdTimer === undefined || !origin) return;

    const distance = Math.hypot(
      event.clientX - origin.x,
      event.clientY - origin.y,
    );

    if (distance > moveThreshold) stopHold();
  }

  function onPointerEnd() {
    stopHold();

    // The menu is already open, so the click the lifted finger still produces
    // must reach nothing: it would re-select the card or dismiss the menu by
    // landing on its backdrop.
    if (openedByHold) armClickSwallow();
  }

  function onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    stopHold();

    if (openedByHold) return;

    trigger(event);
  }

  onScopeDispose(() => {
    stopHold();
    disarmClickSwallow();
  });

  return {
    handlers: {
      pointerdown: onPointerDown,
      pointermove: onPointerMove,
      pointerup: onPointerEnd,
      pointercancel: onPointerEnd,
      pointerleave: onPointerEnd,
      contextmenu: onContextMenu,
    },
  };
}
