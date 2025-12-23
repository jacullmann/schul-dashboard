// src/directives/vLongPress.ts
import type { DirectiveBinding } from 'vue';

export const vLongPress = {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
        let pressTimer: ReturnType<typeof setTimeout> | null = null;

        const start = (e: Event) => {
            if (e.type === 'mousedown' && (e as MouseEvent).button !== 0) return;

            if (pressTimer === null) {
                pressTimer = setTimeout(() => {
                    binding.value(e);
                    pressTimer = null;
                }, 500);
            }
        };

        const cancel = () => {
            if (pressTimer !== null) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        el.addEventListener('mousedown', start);
        el.addEventListener('touchstart', start, { passive: true });

        el.addEventListener('click', cancel);
        el.addEventListener('mouseout', cancel);
        el.addEventListener('touchend', cancel);
        el.addEventListener('touchcancel', cancel);
        el.addEventListener('touchmove', cancel);
    }
};