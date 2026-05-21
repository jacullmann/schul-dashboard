import type { Directive } from 'vue';

const rippleHandlers = new WeakMap<HTMLElement, (e: MouseEvent) => void>();

export const vRipple: Directive<HTMLElement> = {
  mounted(el) {
    // 1. Ensure the host element has a position relative/absolute/fixed/sticky to anchor the ripple container
    if (window.getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }

    const handler = (e: MouseEvent) => {
      // 2. Performance & UX guard: Do not trigger if the button is disabled or loading
      if (
        el.hasAttribute('disabled') ||
        el.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      // 3. Gold-Standard Isolation: Find or create a dedicated ripple container.
      // We look only at direct children to avoid collision with nested directives.
      let container = Array.from(el.children).find((child) =>
        child.classList.contains('v-ripple-container'),
      ) as HTMLElement | null;

      if (!container) {
        container = document.createElement('div');
        container.classList.add('v-ripple-container');

        // Apply container structural styles to clip the ripples exactly to the parent
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
        container.style.overflow = 'hidden';
        container.style.pointerEvents = 'none';
        container.style.borderRadius = 'inherit'; // Inherit border-radius to clip ripple path
        container.style.zIndex = '0'; // Keep behind text/icons but above background

        el.appendChild(container);
      }

      const rect = el.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      const circle = document.createElement('span');

      // 4. Size and Position calculations
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;

      // 5. Structural styling
      circle.style.position = 'absolute';
      circle.style.borderRadius = '50%';
      circle.style.transform = 'scale(0)';
      circle.style.pointerEvents = 'none';

      // 6. The Magic Multi-Color Fix: Inherit the button's text color with subtle opacity
      circle.style.backgroundColor = 'currentColor';
      circle.style.opacity = '0.12';

      // 7. Connect to Tailwind v4 theme animation hook
      circle.style.animation = 'var(--animate-ripple)';

      circle.addEventListener('animationend', () => {
        circle.remove();
        // Dynamic DOM cleanup: Destroy container when there are no active ripples left
        if (container && container.childElementCount === 0) {
          container.remove();
        }
      });

      container.appendChild(circle);
    };

    el.addEventListener('mousedown', handler);
    rippleHandlers.set(el, handler);
  },
  unmounted(el) {
    const handler = rippleHandlers.get(el);
    if (handler) {
      el.removeEventListener('mousedown', handler);
      rippleHandlers.delete(el);
    }
    // Clean up container if it exists
    const container = Array.from(el.children).find((child) =>
      child.classList.contains('v-ripple-container'),
    );
    if (container) {
      container.remove();
    }
  },
};

export default vRipple;
