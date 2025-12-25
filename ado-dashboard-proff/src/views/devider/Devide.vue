<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';

// Deine Komponenten
import Finaleb from "../../components/Finaleb.vue";
import Kuerzel from "../tools/Kuerzel.vue";
import DaltonFinder from "../tools/DaltonFinder.vue";

// --- 1. Typdefinitionen ---
interface Widget {
  id: string;
  // Hier werden die Anzeigenamen verwendet, die im Header erscheinen.
  component: 'Stundenplan' | 'Kürzelfinder' | 'Daltonraum-Finder';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

const initialLayout: Widget[] = [
  { id: 'finaleb', component: 'Stundenplan', x: 20, y: 20, width: 600, height: 450, zIndex: 10 },
  { id: 'kuerzel', component: 'Kürzelfinder', x: 650, y: 20, width: 300, height: 450, zIndex: 11 },
  { id: 'dalton', component: 'Daltonraum-Finder', x: 300, y: 500, width: 500, height: 350, zIndex: 12 },
];

const widgets = reactive(initialLayout);
const nextZIndex = ref(widgets.length + 10); // Startet nach den initialen zIndex-Werten

// Zustand für die Drag- und Resize-Logik
const activeDragWidget = ref<Widget | null>(null);
const dragStartX = ref(0);
const dragStartY = ref(0);
const startWidgetX = ref(0);
const startWidgetY = ref(0);

const activeResizeWidget = ref<Widget | null>(null);
const resizeHandle = ref<'r' | 'b' | 'br' | null>(null);
const startWidgetW = ref(0);
const startWidgetH = ref(0);

const minWidgetSize = 250; // Minimale Größe in Pixeln

// --- 3. Logik für Z-Index ---
const focusWidget = (widget: Widget) => {
  // Erhöht den zIndex des angeklickten Widgets, um es in den Vordergrund zu bringen
  widget.zIndex = nextZIndex.value++;
};

// --- 4. Logik für Drag (Verschieben) ---

const startDrag = (event: MouseEvent, widget: Widget) => {
  event.preventDefault();

  // Stelle das Widget in den Vordergrund
  focusWidget(widget);

  activeDragWidget.value = widget;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  startWidgetX.value = widget.x;
  startWidgetY.value = widget.y;

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event: MouseEvent) => {
  const widget = activeDragWidget.value;
  if (!widget) return;

  const dx = event.clientX - dragStartX.value;
  const dy = event.clientY - dragStartY.value;

  // Neue Positionen berechnen und aktualisieren
  widget.x = startWidgetX.value + dx;
  widget.y = startWidgetY.value + dy;

  // Begrenzung an den Bildschirmrand
  if (widget.x < 0) widget.x = 0;
  if (widget.y < 0) widget.y = 0;
};

const stopDrag = () => {
  activeDragWidget.value = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};


// --- 5. Logik für Resize (Größe ändern) ---

const startResize = (event: MouseEvent, widget: Widget, handle: 'r' | 'b' | 'br') => {
  event.preventDefault();
  event.stopPropagation(); // Verhindert, dass der Drag-Event gleichzeitig ausgelöst wird

  focusWidget(widget);
  activeResizeWidget.value = widget;
  resizeHandle.value = handle;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  startWidgetW.value = widget.width;
  startWidgetH.value = widget.height;

  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
};

const onResize = (event: MouseEvent) => {
  const widget = activeResizeWidget.value;
  const handle = resizeHandle.value;
  if (!widget || !handle) return;

  const dx = event.clientX - dragStartX.value;
  const dy = event.clientY - dragStartY.value;

  // Logik für rechte Seite und untere rechte Ecke
  if (handle.includes('r')) {
    widget.width = Math.max(minWidgetSize, startWidgetW.value + dx);
  }
  // Logik für untere Seite und untere rechte Ecke
  if (handle.includes('b')) {
    widget.height = Math.max(minWidgetSize, startWidgetH.value + dy);
  }
};

const stopResize = () => {
  activeResizeWidget.value = null;
  resizeHandle.value = null;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
};


// --- 6. Lifecycle Hooks ---
onMounted(() => {
  // Optional: Layout aus LocalStorage laden, damit die Positionen gespeichert bleiben
});

onUnmounted(() => {
  // Stelle sicher, dass Event-Listener entfernt werden
  stopDrag();
  stopResize();
});

</script>

<template>
  <div class="devider-container">

    <div
        v-for="widget in widgets"
        :key="widget.id"
        class="widget-window"
        :style="{
        left: widget.x + 'px',
        top: widget.y + 'px',
        width: widget.width + 'px',
        height: widget.height + 'px',
        zIndex: widget.zIndex,
      }"
    >
      <header
          class="widget-header"
          @mousedown="startDrag($event, widget)"
      >
        <h3>{{ widget.component }}</h3>
      </header>

      <div class="widget-content">
        <component
            :is="widget.component === 'Stundenplan' ? Finaleb : (widget.component === 'Kürzelfinder' ? Kuerzel : DaltonFinder)"
        />
      </div>

      <div class="resize-handle right" @mousedown="startResize($event, widget, 'r')"></div>
      <div class="resize-handle bottom" @mousedown="startResize($event, widget, 'b')"></div>
      <div class="resize-handle corner" @mousedown="startResize($event, widget, 'br')"></div>
    </div>

  </div>
</template>

<style scoped>
/* Der Haupt-Container für das gesamte Dashboard */
.devider-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: var(--bg);
  cursor: default;
  overflow-x: scroll;

}

/* Stil für das einzelne Widget-Fenster */
.widget-window {
  position: absolute;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 8px;
  box-shadow: var(--shadow-s);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 250px;
  min-height: 250px;
}

/* Header (Ziehgriff) */
.widget-header {
  height: 32px;
  padding: 0 15px;
  background: var(--border2);
  border-bottom: 1px solid var(--border);
  cursor: grab;
  display: flex;
  align-items: center;
  user-select: none;
  flex-shrink: 0;
}

.widget-header h3 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text);
}

/* Inhalt des Widgets */
.widget-content {
  flex-grow: 1;
  overflow: auto;
  padding: 10px;
}

/* Korrektur: Neutralisiere alle äußeren Container in deinen Komponenten, damit sie perfekt in das Dashboard-Fenster passen */
:global(.widget-content .card),
:global(.widget-content .teacher-card) {
  width: 100%;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
}

/* --- RESIZE HANDLES --- */
.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  z-index: 100;
}

/* Rechter Griff */
.resize-handle.right {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  cursor: ew-resize;
  width: 5px;
}

/* Unterer Griff */
.resize-handle.bottom {
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  cursor: ns-resize;
  height: 5px;
}

/* Unterer rechter Griff (Ecke) */
.resize-handle.corner {
  right: 0;
  bottom: 0;
  cursor: se-resize;
  width: 15px;
  height: 15px;
  border-bottom: 3px solid var(--text);
  border-right: 3px solid var(--text);
  opacity: 0.7;
}
</style>