import { ref } from 'vue';

export function useRipple() {
    const ripples = ref<
        {
            id: number;
            x: number;
            y: number;
            color: string;
            size: number;
        }[]
    >([]);

    function createRipple(event: MouseEvent) {
        const button = event.currentTarget as HTMLElement;

        // Erstelle ein Ripple-Element, das wir nur für die Animation nutzen
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.5;

        // Berechne die Position des Klicks relativ zum Button
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        const color = getComputedStyle(button).getPropertyValue('--ripple-color') || 'rgba(255, 255, 255, 0.3)';

        const newRipple = {
            id: Date.now(), // Eindeutige ID
            x,
            y,
            size,
            color,
        };

        ripples.value.push(newRipple);

        // Entferne den Ripple nach der Animation
        setTimeout(() => {
            ripples.value = ripples.value.filter(ripple => ripple.id !== newRipple.id);
        }, 600); // Entspricht der Animationsdauer in CSS
    }

    return {
        ripples,
        createRipple,
    };
}