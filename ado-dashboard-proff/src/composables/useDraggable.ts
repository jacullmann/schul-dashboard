// composables/useResizableAndDraggable.ts
import { ref, reactive, computed, Ref, onMounted, onUnmounted } from 'vue';

// Definiert die Zustände für Position und Größe
export interface ElementState {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Typen für die Skalierungsrichtung
export type ResizeDirection = 'none' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Hilfsfunktion zur Unterscheidung von Maus- und Touch-Events
function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent {
    return 'touches' in event;
}

export function useResizableAndDraggable(
    targetEl: Ref<HTMLElement | null>,
    headerEl: Ref<HTMLElement | null>,
    isPinned: Ref<boolean>, // NEU: Pin-Status empfangen
    initialState: ElementState = { x: 50, y: 50, width: 300, height: 200 }
) {
    const state = reactive<ElementState>({
        ...initialState,
    });

    // Speichert den Zustand vor dem Vollbild-Modus
    const previousState = reactive<ElementState>({ ...initialState });

    const isDragging = ref(false);
    const isResizing = ref(false);
    const isFullscreen = ref(false);
    const currentDirection = ref<ResizeDirection>('none');

    // Wird benötigt, um den Klick-Offset für Drag/Resize zu speichern
    const dragStart = reactive({ clientX: 0, clientY: 0, x: 0, y: 0, width: 0, height: 0 });

    // Abstand vom Cursor zum Rand (in Pixeln), um Skalierung auszulösen
    const RESIZE_HANDLE_SIZE = 10;

    // --- Style Logik ---

    const draggableStyle = computed(() => ({
        position: 'fixed',
        left: `${state.x}px`,
        top: `${state.y}px`,
        width: `${state.width}px`,
        height: `${state.height}px`,
        userSelect: 'none',
        transition: (isDragging.value || isResizing.value) ? 'none' : 'all 0.3s ease', // Übergang für Docking/Vollbild
        zIndex: isPinned.value ? 10000001 : 10000000, // NEU: Höherer zIndex, wenn gepinnt
    }));

    const cursorStyle = computed(() => {
        if (isResizing.value) {
            // Skalierungs-Cursor, wenn gerade skaliert wird
            return currentDirection.value.includes('top') || currentDirection.value.includes('bottom') ? 'ns-resize' :
                currentDirection.value.includes('left') || currentDirection.value.includes('right') ? 'ew-resize' :
                    (currentDirection.value.includes('top') && currentDirection.value.includes('left')) || (currentDirection.value.includes('bottom') && currentDirection.value.includes('right')) ? 'nwse-resize' :
                        'nesw-resize';
        }
        // Standard-Cursor, wenn nicht skaliert wird
        return isDragging.value ? 'grabbing' : 'auto';
    });


    const getResizeDirection = (event: MouseEvent | TouchEvent): ResizeDirection => {
        // NEU: Kein Resize, wenn gepinnt oder im Vollbild
        if (isFullscreen.value || isPinned.value) return 'none';

        const clientX = isTouchEvent(event) ? event.touches[0].clientX : event.clientX;
        const clientY = isTouchEvent(event) ? event.touches[0].clientY : event.clientY;

        if (!targetEl.value) return 'none';
        const rect = targetEl.value.getBoundingClientRect();

        const nearTop = Math.abs(clientY - rect.top) <= RESIZE_HANDLE_SIZE;
        const nearBottom = Math.abs(clientY - rect.bottom) <= RESIZE_HANDLE_SIZE;
        const nearLeft = Math.abs(clientX - rect.left) <= RESIZE_HANDLE_SIZE;
        const nearRight = Math.abs(clientX - rect.right) <= RESIZE_HANDLE_SIZE;

        if (nearTop && nearLeft) return 'top-left';
        if (nearTop && nearRight) return 'top-right';
        if (nearBottom && nearLeft) return 'bottom-left';
        if (nearBottom && nearRight) return 'bottom-right';
        if (nearTop) return 'top';
        if (nearBottom) return 'bottom';
        if (nearLeft) return 'left';
        if (nearRight) return 'right';

        return 'none';
    };

    /**
     * Schaltet den Vollbildmodus (und zurück) um.
     */
    const toggleFullscreen = () => {
        if (isFullscreen.value) {
            // Wiederherstellen des Zustands
            state.x = previousState.x;
            state.y = previousState.y;
            state.width = previousState.width;
            state.height = previousState.height;
            isFullscreen.value = false;
        } else {
            // Speichern des aktuellen Zustands
            previousState.x = state.x;
            previousState.y = state.y;
            previousState.width = state.width;
            previousState.height = state.height;

            // Vollbild setzen
            state.x = 0;
            state.y = 0;
            state.width = window.innerWidth;
            state.height = window.innerHeight;
            isFullscreen.value = true;
        }
    };

    // --- Event Handler ---

    /**
     * Startet den Drag- oder Resize-Vorgang.
     */
    const onStart = (event: MouseEvent | TouchEvent) => {
        // NEU: Abbruch, wenn gepinnt
        if (!targetEl.value || isPinned.value) return;

        const clientX = isTouchEvent(event) ? event.touches[0].clientX : event.clientX;
        const clientY = isTouchEvent(event) ? event.touches[0].clientY : event.clientY;

        // 1. Skalierung prüfen
        const direction = getResizeDirection(event);
        if (direction !== 'none') {
            isResizing.value = true;
            currentDirection.value = direction;

            // Speichern des Ausgangszustands für die Skalierung
            dragStart.clientX = clientX;
            dragStart.clientY = clientY;
            dragStart.x = state.x;
            dragStart.y = state.y;
            dragStart.width = state.width;
            dragStart.height = state.height;

            event.preventDefault();
            return;
        }

        // 2. Ziehen prüfen (nur auf dem Header, wenn dieser übergeben wurde und Ziel ist)
        // Prüfen, ob das Event-Ziel der Header oder ein Kind des Headers ist
        if (headerEl.value && !headerEl.value.contains(event.target as Node)) return;


        if (!isFullscreen.value) {
            isDragging.value = true;

            // Speichern des Ausgangszustands für das Ziehen
            dragStart.clientX = clientX;
            dragStart.clientY = clientY;
            dragStart.x = state.x;
            dragStart.y = state.y;

            event.preventDefault();
        }
    };

    /**
     * Verarbeitet Ziehen, Skalieren und Docking.
     */
    const onMove = (event: MouseEvent | TouchEvent) => {
        // NEU: Abbruch, wenn gepinnt (obwohl onStart dies bereits verhindern sollte)
        if (!targetEl.value || isPinned.value) return;

        const clientX = isTouchEvent(event) ? event.touches[0].clientX : event.clientX;
        const clientY = isTouchEvent(event) ? event.touches[0].clientY : event.clientY;

        const dx = clientX - dragStart.clientX;
        const dy = clientY - dragStart.clientY;

        // A. Skalieren
        if (isResizing.value) {
            // Breite und Höhe mit den aktuellen Werten aus dragStart initialisieren
            let newX = dragStart.x;
            let newY = dragStart.y;
            let newWidth = dragStart.width;
            let newHeight = dragStart.height;

            // Logik für die Größenänderung in Abhängigkeit von der Richtung
            if (currentDirection.value.includes('top')) {
                newHeight = dragStart.height - dy;
                newY = dragStart.y + dy;
            }
            if (currentDirection.value.includes('bottom')) {
                newHeight = dragStart.height + dy;
            }
            if (currentDirection.value.includes('left')) {
                newWidth = dragStart.width - dx;
                newX = dragStart.x + dx;
            }
            if (currentDirection.value.includes('right')) {
                newWidth = dragStart.width + dx;
            }

            // Mindestgröße
            const minWidth = 250; // Mindestbreite erhöht, damit Icons Platz haben
            const minHeight = 150;

            if (newWidth >= minWidth) {
                state.width = newWidth;
                if (currentDirection.value.includes('left')) {
                    state.x = newX;
                }
            }
            if (newHeight >= minHeight) {
                state.height = newHeight;
                if (currentDirection.value.includes('top')) {
                    state.y = newY;
                }
            }

            // Begrenzung innerhalb des Viewports nach der Skalierung (optional, aber ratsam)
            state.x = Math.min(Math.max(0, state.x), window.innerWidth - state.width);
            state.y = Math.min(Math.max(0, state.y), window.innerHeight - state.height);

            // B. Ziehen und Docking
        } else if (isDragging.value) {
            let newX = dragStart.x + dx;
            let newY = dragStart.y + dy;

            // --- Docking-Logik ---
            const DOCKING_THRESHOLD = 20; // Pixel vom Rand

            // Docking an den oberen Rand -> Vollbild
            if (newY <= DOCKING_THRESHOLD) {
                if (!isFullscreen.value) {
                    toggleFullscreen(); // Schaltet auf Vollbild
                    // Nach dem Vollbild wird das Ziehen beendet, um zu verhindern, dass es direkt wieder losgezogen wird
                    isDragging.value = false;
                    return;
                }
            } else if (isFullscreen.value) {
                // Wenn man das Element ein Stück vom Rand wegzieht, Vollbild beenden
                toggleFullscreen();
            }

            // Normale Begrenzung auf den Viewport, falls nicht im Vollbild
            if (!isFullscreen.value) {
                const maxX = window.innerWidth - state.width;
                const maxY = window.innerHeight - state.height;

                state.x = Math.min(Math.max(0, newX), maxX);
                state.y = Math.min(Math.max(0, newY), maxY);
            }
        } else {
            // C. Hover-Cursor-Anpassung
            const direction = getResizeDirection(event);
            // Nur ändern, wenn nicht gepinnt
            if (!isPinned.value) {
                targetEl.value.style.cursor = direction !== 'none' ?
                    (direction.includes('top') || direction.includes('bottom') ? 'ns-resize' :
                        direction.includes('left') || direction.includes('right') ? 'ew-resize' :
                            (direction.includes('top-left')) || (direction.includes('bottom-right')) ? 'nwse-resize' :
                                'nesw-resize')
                    : 'auto';
            } else {
                targetEl.value.style.cursor = 'auto';
            }
        }
    };

    /**
     * Beendet Ziehen und Skalieren.
     */
    const onEnd = () => {
        isDragging.value = false;
        isResizing.value = false;
        if (targetEl.value) {
            targetEl.value.style.cursor = 'auto'; // Setzt den Cursor auf den Standardwert zurück
        }
        currentDirection.value = 'none';
    };

    /**
     * Event Listener registrieren/entfernen.
     */
    onMounted(() => {
        if (targetEl.value) {
            // Listener für Hover (MouseMove)
            targetEl.value.addEventListener('mousemove', onMove as any);

            // Start (MouseDown/TouchStart) NUR auf dem Header
            if (headerEl.value) {
                headerEl.value.addEventListener('mousedown', onStart as any);
                headerEl.value.addEventListener('touchstart', onStart as any);
                // Doppelklick für Vollbild/Zurück auf dem Header
                headerEl.value.addEventListener('dblclick', toggleFullscreen);
            } else {
                // Fallback, falls kein Header da ist (sollte hier nicht passieren)
                targetEl.value.addEventListener('mousedown', onStart as any);
                targetEl.value.addEventListener('touchstart', onStart as any);
            }

            // Globale Listener für Move und End, damit das Event nicht abbricht, wenn der Cursor das Element verlässt
            document.addEventListener('mousemove', onMove as any);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove as any);
            document.addEventListener('touchend', onEnd);
        }
    });

    onUnmounted(() => {
        // Globale Listener entfernen
        document.removeEventListener('mousemove', onMove as any);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove as any);
        document.removeEventListener('touchend', onEnd);

        // Lokale Listener entfernen
        if (targetEl.value) {
            targetEl.value.removeEventListener('mousemove', onMove as any);
        }
        if (headerEl.value) {
            headerEl.value.removeEventListener('mousedown', onStart as any);
            headerEl.value.removeEventListener('touchstart', onStart as any);
            headerEl.value.removeEventListener('dblclick', toggleFullscreen);
        }
    });

    return {
        state,
        draggableStyle,
        isFullscreen,
        toggleFullscreen,
    };
}
