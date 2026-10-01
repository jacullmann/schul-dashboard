import { prefersReducedMotion } from '@/utils/motion';

const COLLAPSE_MS = 360;
const COLLAPSE_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
/** The content is gone before the gap has halfway closed, so it never reads as squeezed. */
const FADE_MS = 180;
const FADE_EASING = 'ease-out';
/** Covers a transitionend that never arrives, as for an element already out of view. */
const FALLBACK_SLACK_MS = 50;

/**
 * Folds an element away to nothing, so what follows it in the list moves up
 * with it instead of jumping once it is gone.
 */
export function collapseHeight(el: HTMLElement, onCollapsed: () => void) {
  if (prefersReducedMotion()) {
    onCollapsed();
    return;
  }

  el.style.height = `${el.offsetHeight}px`;
  el.style.overflow = 'hidden';
  void el.offsetHeight;

  const fold = `${COLLAPSE_MS}ms ${COLLAPSE_EASING}`;
  el.style.transition = `height ${fold}, margin ${fold}, border-width ${fold}, opacity ${FADE_MS}ms ${FADE_EASING}`;
  el.style.height = '0';
  el.style.marginBlock = '0';
  // A separator is nothing but its border, which a height of 0 leaves standing.
  el.style.borderBlockWidth = '0';
  el.style.opacity = '0';

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.removeEventListener('transitionend', onEnd);
    clearTimeout(fallback);
    onCollapsed();
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.target === el && e.propertyName === 'height') finish();
  };
  el.addEventListener('transitionend', onEnd);
  const fallback = setTimeout(finish, COLLAPSE_MS + FALLBACK_SLACK_MS);
}
