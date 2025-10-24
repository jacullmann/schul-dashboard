<template>
  <Transition name="mac-window" @after-leave="emitCloseSignal">
    <div
        v-if="isVisible"
        v-show="isShown"
        class="draggable-card"
        :class="{
          'is-docked': state.isDocked,
          'is-collapsed': state.isCollapsed,
          'is-locked': state.isLocked
        }"
        ref="cardRef"
        :style="[cardStyle, { 'transform-origin': animationOrigin }]"
        @mousedown.stop="startDrag"
        @touchstart.stop="startDrag"
    >
      <div class="card-header" @dblclick.stop="handleHeaderDblClick">
        <div class="card-controls-left">
          <button
              @click.stop="toggleLock"
              class="control-btn"
              :title="state.isLocked ? 'Position entsperren' : 'Position sperren'"
          >


            <svg v-if="state.isLocked"  xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-keyhole-icon lucide-lock-keyhole"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>
            <svg v-else  xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-keyhole-open-icon lucide-lock-keyhole-open"><circle cx="12" cy="16" r="1"/><rect width="18" height="12" x="3" y="10" rx="2"/><path d="M7 10V7a5 5 0 0 1 9.33-2.5"/></svg>
          </button>
          <button
              @click.stop="togglePin"
              class="control-btn"
              :title="state.isPinned ? 'Anheftung lösen' : 'Immer oben'"
          >
            <svg v-if="state.isPinned" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-off-icon lucide-pin-off"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></svg>
          </button>
        </div>

        <div class="card-title">Mac</div>

        <div class="card-controls-right">
          <button
              @click.stop="resetPosition"
              :disabled="state.isLocked"
              class="control-btn reset"
              title="Position & Größe zurücksetzen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button
              @click.stop="toggleCollapse"
              :disabled="state.isDocked || state.isLocked"
              class="control-btn minimize"
              title="Einklappen"
          >
            –
          </button>
          <button
              @click.stop="startCloseAnimation"
              class="control-btn close"
              title="Schließen"
          >
            X
          </button>
        </div>
      </div>

      <div v-show="!state.isCollapsed" class="card-content">
        <textarea class="inputs"></textarea>
      </div>

      <template v-if="!state.isDocked && !state.isCollapsed && !state.isLocked">
        <div class="resize-handle top" @mousedown.stop="startResize($event, 'top')"></div>
        <div class="resize-handle right" @mousedown.stop="startResize($event, 'right')"></div>
        <div class="resize-handle bottom" @mousedown.stop="startResize($event, 'bottom')"></div>
        <div class="resize-handle left" @mousedown.stop="startResize($event, 'left')"></div>
        <div class="resize-handle top-left" @mousedown.stop="startResize($event, 'top-left')"></div>
        <div class="resize-handle top-right" @mousedown.stop="startResize($event, 'top-right')"></div>
        <div class="resize-handle bottom-left" @mousedown.stop="startResize($event, 'bottom-left')"></div>
        <div class="resize-handle bottom-right" @mousedown.stop="startResize($event, 'bottom-right')"></div>
      </template>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

// --- Props und Emits ---
const props = defineProps<{
  isVisible: boolean; // Steuert das Öffnen/Schließen von außen
  // NEU: Der Ursprungspunkt für die Animation
  origin: { x: number, y: number };
}>();

const emit = defineEmits(['close']);

// --- Konstanten und Konfiguration ---
const SNAP_THRESHOLD = 20;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 300;
const HEADER_HEIGHT = 40;

// --- Zustand ---
const isShown = ref(false); // Für die v-show Transition
const cardRef = ref<HTMLElement | null>(null);
const didEmitClose = ref(false); // Verhindert doppeltes 'close' Event

interface CardState {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isDragging: boolean;
  isResizing: boolean;
  resizeDirection: string;
  isDocked: boolean;
  dockedSide: 'none' | 'left' | 'right' | 'top' | 'bottom';
  isCollapsed: boolean;
  lastHeight: number;
  isLocked: boolean;  // NEU: Verhindert Drag & Resize
  isPinned: boolean;  // NEU: Für z-index "always on top"
}

const state = reactive<CardState>({
  x: window.innerWidth / 2 - DEFAULT_WIDTH / 2,
  y: window.innerHeight / 2 - DEFAULT_HEIGHT / 2,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  minWidth: 250,
  minHeight: 150,
  isDragging: false,
  isResizing: false,
  resizeDirection: 'none',
  isDocked: false,
  dockedSide: 'none',
  isCollapsed: false,
  lastHeight: DEFAULT_HEIGHT,
  isLocked: false, // NEU
  isPinned: false, // NEU
});

// --- Watcher für 'isVisible' Prop (Öffnen/Schließen) ---
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    // Wenn die Karte geöffnet wird
    didEmitClose.value = false;
    resetPosition(); // Setzt die Karte auf Standardwerte zurück

    // Wichtig: 'isShown' erst im nächsten Tick setzen,
    // damit Vue die Start-Position (state.x/y) und den transform-origin
    // für die Animation korrekt berechnen kann.
    nextTick(() => {
      isShown.value = true;
    });
  } else {
    // Wenn die Karte geschlossen wird (startCloseAnimation)
    isShown.value = false;
  }
}, { immediate: true }); // 'immediate' stellt sicher, dass der Zustand initial gesetzt wird

// --- Computed Styles & Animation ---

// NEU: Berechnet den z-index
const zIndex = computed(() => {
  if (state.isPinned) return 1000002;
  if (state.isDragging || state.isResizing) return 1000001;
  return 1000000;
});

// NEU: Berechnet den Ursprung für die Mac-Animation
const animationOrigin = computed(() => {
  // props.origin = Klick-Position (Viewport)
  // state.x/y = Ziel-Position der Karte (Viewport)
  // Wir brauchen den Ursprung relativ zur Karte (state.x/y)
  const relativeOriginX = props.origin.x - state.x;
  const relativeOriginY = props.origin.y - state.y;
  return `${relativeOriginX}px ${relativeOriginY}px`;
});

const cardStyle = computed(() => {
  return {
    '--card-x': `${state.x}px`,
    '--card-y': `${state.y}px`,
    '--card-width': `${state.width}px`,
    '--card-height': `${state.height}px`,
    'z-index': zIndex.value, // NEU: Dynamischer z-index
    // NEU: Cursor ändert sich je nach Zustand
    'cursor': state.isLocked ? 'default' : (state.isDragging ? 'grabbing' : 'grab'),
    'transform': `translate(var(--card-x), var(--card-y))`,
    'transition': (state.isDragging || state.isResizing) ? 'none' : 'all 0.3s ease-in-out',
  };
});

// --- Toolbar-Funktionen (NEU) ---

// Setzt die Karte auf Standardwerte zurück
function centerAndResizeToDefault() {
  const newWidth = Math.max(DEFAULT_WIDTH, state.minWidth);
  const newHeight = Math.max(DEFAULT_HEIGHT, state.minHeight);
  state.width = newWidth;
  state.height = newHeight;
  state.lastHeight = newHeight;
  state.x = (window.innerWidth / 2) - (newWidth / 2);
  state.y = (window.innerHeight / 2) - (newHeight / 2);
}

// Kompletter Reset
function resetPosition() {
  centerAndResizeToDefault();
  state.isDocked = false;
  state.dockedSide = 'none';
  state.isCollapsed = false;
  state.isLocked = false;
  state.isPinned = false;
}

function toggleLock() {
  state.isLocked = !state.isLocked;
}

function togglePin() {
  state.isPinned = !state.isPinned;
}

// NEU: Doppelklick-Handler
function handleHeaderDblClick() {
  if (state.isLocked || state.isDocked) return;
  toggleCollapse();
}


// --- Drag-Handler ---
let dragStart = { x: 0, y: 0 };
let cardStart = { x: 0, y: 0 };

function startDrag(event: MouseEvent | TouchEvent) {
  const target = event.target as HTMLElement;

  // 1. Gesperrt?
  if (state.isLocked) return;
  // 2. Auf Resize-Handle geklickt?
  if (target.classList.contains('resize-handle')) return;

  // 3. (BUGFIX) Nur ziehen, wenn auf den Header geklickt wird (gilt für Maus & Touch)
  const isHeader = target.closest('.card-header');
  if (!isHeader) return;

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

  state.isDragging = true;

  if (state.isDocked) {
    unDock(clientX, clientY);
  }

  dragStart = { x: clientX, y: clientY };
  cardStart = { x: state.x, y: state.y };

  event.preventDefault();

  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', stopDrag);
}

function drag(event: MouseEvent | TouchEvent) {
  if (!state.isDragging) return;
  event.preventDefault(); // Wichtig für Touch-Scrolling

  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

  const deltaX = clientX - dragStart.x;
  const deltaY = clientY - dragStart.y;

  let newX = cardStart.x + deltaX;
  let newY = cardStart.y + deltaY;

  const cardW = state.width;
  const cardH = state.height;
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  state.x = Math.max(0, Math.min(newX, windowW - cardW));
  state.y = Math.max(0, Math.min(newY, windowH - cardH));
}

function stopDrag() {
  state.isDragging = false;

  if (!state.isCollapsed && !state.isLocked) { // NEU: Nicht andocken wenn gesperrt
    checkAndDock();
  }

  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', drag);
  document.removeEventListener('touchend', stopDrag);
}

// --- Resize-Handler ---
let resizeStart = { x: 0, y: 0 };
let cardStartRect = { x: 0, y: 0, width: 0, height: 0 };

function startResize(event: MouseEvent, direction: string) {
  // Gesperrt, gedockt oder eingeklappt? -> Kein Resize.
  if (state.isLocked || state.isDocked || state.isCollapsed) return;

  state.isResizing = true;
  state.resizeDirection = direction;

  resizeStart = { x: event.clientX, y: event.clientY };
  cardStartRect = { x: state.x, y: state.y, width: state.width, height: state.height };

  event.preventDefault();

  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopResize);
}

function resize(event: MouseEvent) {
  if (!state.isResizing) return;

  const clientX = event.clientX;
  const clientY = event.clientY;

  const deltaX = clientX - resizeStart.x;
  const deltaY = clientY - resizeStart.y;

  let newX = cardStartRect.x;
  let newY = cardStartRect.y;
  let newWidth = cardStartRect.width;
  let newHeight = cardStartRect.height;

  const dir = state.resizeDirection;
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  if (dir.includes('right')) newWidth = cardStartRect.width + deltaX;
  if (dir.includes('bottom')) newHeight = cardStartRect.height + deltaY;
  if (dir.includes('left')) {
    newWidth = cardStartRect.width - deltaX;
    newX = cardStartRect.x + deltaX;
  }
  if (dir.includes('top')) {
    newHeight = cardStartRect.height - deltaY;
    newY = cardStartRect.y + deltaY;
  }

  if (newWidth < state.minWidth) {
    if (dir.includes('left')) newX = cardStartRect.x + (cardStartRect.width - state.minWidth);
    newWidth = state.minWidth;
  }
  if (newHeight < state.minHeight) {
    if (dir.includes('top')) newY = cardStartRect.y + (cardStartRect.height - state.minHeight);
    newHeight = state.minHeight;
  }

  if (newX < 0) { newWidth += newX; newX = 0; }
  if (newY < 0) { newHeight += newY; newY = 0; }
  if (newX + newWidth > windowW) newWidth = windowW - newX;
  if (newY + newHeight > windowH) newHeight = windowH - newY;

  if (newWidth < state.minWidth) newWidth = state.minWidth;
  if (newHeight < state.minHeight) newHeight = state.minHeight;

  state.x = newX;
  state.y = newY;
  state.width = newWidth;
  state.height = newHeight;
}

function stopResize() {
  state.isResizing = false;
  state.resizeDirection = 'none';

  if (!state.isCollapsed) {
    state.lastHeight = state.height;
  }

  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);

  if (!state.isLocked) { // NEU
    checkAndDock();
  }
}


// --- Andock-Logik ---
function checkAndDock() {
  if (state.isLocked) return; // NEU

  const x = state.x;
  const y = state.y;
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;
  const cardW = state.width;
  const cardH = state.height;

  const canDock = (cardW < windowW * 0.9) && (cardH < windowH * 0.9);
  if (!canDock) {
    state.isDocked = false;
    state.dockedSide = 'none';
    return;
  }

  if (x < SNAP_THRESHOLD) dock('left');
  else if (x + cardW > windowW - SNAP_THRESHOLD) dock('right');
  else if (y < SNAP_THRESHOLD) dock('top');
  else if (y + cardH > windowH - SNAP_THRESHOLD) dock('bottom');
  else {
    state.isDocked = false;
    state.dockedSide = 'none';
  }
}

function dock(side: 'left' | 'right' | 'top' | 'bottom') {
  if (state.isLocked) return; // NEU

  state.isDocked = true;
  state.isCollapsed = false;
  state.dockedSide = side;

  switch (side) {
    case 'left':
      state.x = 0; state.y = 0;
      state.width = window.innerWidth / 2; state.height = window.innerHeight;
      break;
    case 'right':
      state.x = window.innerWidth / 2; state.y = 0;
      state.width = window.innerWidth / 2; state.height = window.innerHeight;
      break;
    case 'top':
      state.x = 0; state.y = 0;
      state.width = window.innerWidth; state.height = window.innerHeight / 2;
      break;
    case 'bottom':
      state.x = 0; state.y = window.innerHeight / 2;
      state.width = window.innerWidth; state.height = window.innerHeight / 2;
      break;
  }
}

function unDock(clickX?: number, clickY?: number) {
  const oldWidth = state.width;
  const oldHeight = state.height;

  state.isDocked = false;
  state.dockedSide = 'none';
  state.isCollapsed = false;

  // Standardgröße wiederherstellen
  centerAndResizeToDefault();

  if (clickX !== undefined && clickY !== undefined) {
    const relativeX = clickX - state.x; // state.x ist jetzt die *gedockte* Position (z.B. 0)
    const relativeY = clickY - state.y;
    const percentX = relativeX / oldWidth;
    const percentY = relativeY / oldHeight;

    state.x = clickX - (state.width * percentX);
    state.y = clickY - (state.height * percentY);

  }

  // Sicherstellen, dass die Karte im Viewport bleibt
  state.x = Math.max(0, Math.min(state.x, window.innerWidth - state.width));
  state.y = Math.max(0, Math.min(state.y, window.innerHeight - state.height));
}

// --- Einklapp-Logik ---
function toggleCollapse() {
  if (state.isDocked || state.isLocked) return; // NEU: Auch bei 'locked' nicht einklappen

  state.isCollapsed = !state.isCollapsed;
  if (state.isCollapsed) {
    state.height = HEADER_HEIGHT;
  } else {
    state.height = state.lastHeight;
  }
}

// --- Window-Resize Handler ---
function handleResize() {
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  if (state.isDocked) {
    dock(state.dockedSide);
  } else {
    state.x = Math.max(0, Math.min(state.x, windowW - state.width));
    state.y = Math.max(0, Math.min(state.y, windowH - state.height));
    if (state.isCollapsed) {
      state.height = HEADER_HEIGHT;
    }
  }
}

// --- Schließ-Animation ---
function startCloseAnimation() {
  // 'isVisible' wird über die Prop gesteuert, 'isShown' steuert die Animation
  isShown.value = false;
  // Das 'emit' passiert jetzt im '@after-leave' Hook der Transition
}

// NEU: Diese Funktion wird aufgerufen, NACHDEM die 'leave' Animation beendet ist.
function emitCloseSignal() {
  if (!didEmitClose.value && !props.isVisible) {
    emit('close');
    didEmitClose.value = true;
  }
}


// --- Lifecycle Hooks ---
onMounted(() => {
  window.addEventListener('resize', handleResize);
  if(props.isVisible) {
    resetPosition();
    isShown.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  // Aufräumen der globalen Listener (wichtig!)
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', drag);
  document.removeEventListener('touchend', stopDrag);
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
});
</script>

<style scoped>
/* Container nicht mehr benötigt */

.draggable-card {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--card-width);
  height: var(--card-height);
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  /* z-index wird jetzt über 'cardStyle' dynamisch gesetzt */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: black;
  will-change: transform, width, height, opacity;
}

/* ------------------- MAC-STIL ANIMATION (VERBESSERT) ------------------- */
.mac-window-enter-active,
.mac-window-leave-active {
  /* Kubische Bezier-Kurve für sanftes Beschleunigen/Abbremsen */
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
  transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  /* WICHTIG: transform-origin wird jetzt dynamisch per Inline-Style
    gesetzt, basierend auf der 'origin' Prop.
    'transform-origin: center;' wurde entfernt.
  */
}

.mac-window-enter-from,
.mac-window-leave-to {
  opacity: 0;
  /* Wir skalieren auf 0, um den Effekt des "Wachsens" aus dem
    Ursprungspunkt zu maximieren.
  */
  transform: translate(var(--card-x), var(--card-y)) scale(0);
}

/* ------------------- NEU: HEADER-TOOLBAR ------------------- */
.card-header {
  height: 40px; /* Muss zu HEADER_HEIGHT in <script> passen */
  background-color: #f1f1f1;
  color: #333;
  padding: 0 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  flex-shrink: 0;
  border-bottom: 1px solid #ddd;
  position: relative; /* Wichtig für die Zentrierung des Titels */
}

.card-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-weight: 600;
  font-size: 14px;
  pointer-events: none; /* Lässt Klicks zum Header "durch" (für Dragging) */
}

.card-controls-left,
.card-controls-right {
  display: flex;
  gap: 6px;
  z-index: 1; /* Stellt sicher, dass Buttons über dem Titel liegen */
}

.control-btn {
  border: none; border-radius: 50%; width: 16px; height: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: bold; line-height: 1; padding: 0;
  cursor: pointer; transition: transform 0.1s ease;
  background: #e0e0e0;
  color: #555;
}
.control-btn:hover { transform: scale(1.0); }
.control-btn.close { background: #ff5f57; color: #a43e39; }
.control-btn.minimize { background: #ffbd2e; color: #a77a1d; font-size: 16px; padding-bottom: 3px; }
.control-btn.reset { font-size: 14px; }

/* Styling für 'disabled' und 'locked' */
.control-btn:disabled {
  background: #e0e0e0 !important;
  color: #aaa !important;
  cursor: not-allowed;
  transform: none;
}

/* ------------------- KARTENINHALT ------------------- */
.card-content {
  padding: 15px;
  flex-grow: 1;
  overflow-y: auto;
  background-color: #ffffff;
  cursor: auto;
  height: 100%;
  width: 100%;
}

/* ------------------- RESIZE-HANDLES ------------------- */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
}
.resize-handle.top { top: -5px; left: 10px; right: 10px; height: 10px; cursor: ns-resize; }
.resize-handle.bottom { bottom: -5px; left: 10px; right: 10px; height: 10px; cursor: ns-resize; }
.resize-handle.left { left: -5px; top: 10px; bottom: 10px; width: 10px; cursor: ew-resize; }
.resize-handle.right { right: -5px; top: 10px; bottom: 10px; width: 10px; cursor: ew-resize; }
.resize-handle.top-left { top: -5px; left: -5px; width: 10px; height: 10px; cursor: nwse-resize; z-index: 11; }
.resize-handle.top-right { top: -5px; right: -5px; width: 10px; height: 10px; cursor: nesw-resize; z-index: 11; }
.resize-handle.bottom-left { bottom: -5px; left: -5px; width: 10px; height: 10px; cursor: nesw-resize; z-index: 11; }
.resize-handle.bottom-right { bottom: -5px; right: -5px; width: 10px; height: 10px; cursor: nwse-resize; z-index: 11; }

/* Handles ausblenden, wenn nicht benötigt (v-if löst das, aber CSS ist ein guter Fallback) */
.draggable-card.is-docked .resize-handle,
.draggable-card.is-collapsed .resize-handle,
.draggable-card.is-locked .resize-handle {
  display: none;
}

.inputs{
  height: 100%;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 0;
  color: var(--bg);
  background-color: transparent;
}
</style>