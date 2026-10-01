export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// An explicit `behavior: 'smooth'` overrides the stylesheet's
// `scroll-behavior: auto`, so scripted scrolls have to opt out themselves.
export function preferredScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
