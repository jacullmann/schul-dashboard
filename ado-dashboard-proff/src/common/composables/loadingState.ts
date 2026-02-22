import { ref, computed } from 'vue';

// Globaler State (Singleton)
const progress = ref(0);
const isLoading = ref(false);
const opacity = ref(1);

let timer: ReturnType<typeof setInterval> | null = null;

// Konstanten für das Timing
const STEP_INTERVAL = 200; // Wie oft aktualisiert wird (ms)
const TRICKLE_AMOUNT = 5; // Basis-Inkrement

export function useLoadingBar() {

    // Startet den Balken
    const start = () => {
        if (timer) clearInterval(timer);

        progress.value = 0;
        opacity.value = 1;
        isLoading.value = true;

        // "Trickle"-Logik: Startet schnell, wird langsamer, erreicht nie 100% von allein
        timer = setInterval(() => {
            increment();
        }, STEP_INTERVAL);
    };

    // Erhöht den Balken basierend auf dem aktuellen Fortschritt
    const increment = () => {
        if (progress.value >= 95) return; // Bleibt bei 95% stehen warten

        let amount = 0;
        if (progress.value >= 0 && progress.value < 20) {
            amount = 10; // Schnellstart
        } else if (progress.value >= 20 && progress.value < 50) {
            amount = 4;
        } else if (progress.value >= 50 && progress.value < 80) {
            amount = 2;
        } else {
            amount = 0.5; // Sehr langsam am Ende
        }

        progress.value = Math.min(progress.value + amount, 99.4);
    };

    // Beendet den Ladevorgang
    const finish = () => {
        if (timer) clearInterval(timer);
        timer = null;

        progress.value = 100;

        // Kurz warten, damit der Nutzer die 100% sieht, dann ausblenden
        setTimeout(() => {
            opacity.value = 0;
            setTimeout(() => {
                isLoading.value = false;
                progress.value = 0;
                opacity.value = 1;
            }, 400); // Wartezeit muss zur CSS transition passen
        }, 300);
    };

    return {
        loading: computed(() => isLoading.value),
        progress: computed(() => progress.value),
        opacity: computed(() => opacity.value),
        start,
        finish
    };
}