<template>
  <div
      ref="popupRef"
      :style="draggableStyle"
      :class="{ 'fullscreen-mode': isFullscreen, 'is-pinned': isPinned }"
      class="draggable-resizable-popup"
  >
    <header ref="headerRef" class="popup-header">
      <p></p>

      <Transition name="titel-edit" mode="out-in">
        <div
            v-if="!isEditingTitle"
            class="titel"
            title="Doppelklick zum Bearbeiten"
            @dblclick="startEditingTitle"
        >
          {{ noteTitel }}
        </div>
        <input
            v-else
            ref="titelInputRef"
            v-model="noteTitel"
            class="titel-input"
            @blur="stopEditingTitle"
            @keyup.enter="stopEditingTitle"
        />
      </Transition>

      <!-- Container für alle Icons auf der rechten Seite -->
      <div class="options-container">

        <!-- NEU: Pin-Button -->
        <button
            @click="togglePin"
            class="header-icon-button pin-button"
            :title="isPinned ? 'Notiz lösen' : 'Notiz anheften'"
        >
          <PinOff v-if="isPinned" :size="18" />
          <Pin v-else :size="18" />
        </button>

        <!-- Menü-Button-Bereich -->
        <div ref="menuButtonWrapperRef" class="menu-button-wrapper">

          <!-- Der Menu-Icon oder der Close-Icon -->
          <component
              :is="menuIsn ? Menu : X"
              @click="toggleMenu"
              class="options-menu-icon header-icon-button"
          />

          <!-- Vue Transition für den Dropdown-Effekt -->
          <Transition name="dropdown">
            <div v-if="!menuIsn" class="dropdown-menu">
              <!-- Inhalt des Dropdown-Menüs -->
              <div class="menu-item" @click="startEditingTitle">Titel bearbeiten</div>
              <div class="menu-item" @click="closeMenu">Speichern</div>
              <div class="menu-item" @click="closeMenu">Einstellungen</div>
              <div class="menu-item" @click="closeMenu">Hilfe</div>
              <div class="menu-separator"></div>
              <div class="menu-item menu-item-danger" @click="closeMenu">Löschen</div>
            </div>
          </Transition>

        </div>

        <!-- Fullscreen-Button -->
        <button @click="toggleFullscreen" class="header-icon-button fullscreen-button">
          <Minimize v-if="isFullscreen" :size="18"/>
          <Maximize v-else-if="!isFullscreen" :size="18"/>
        </button>

      </div>
    </header>
    <main class="popup-content">
      <textarea v-model="usertext" class="popup-contents" placeholder="Hier Notizen eingeben..."/>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref, watch, onUnmounted, nextTick } from 'vue';
// Fullscreen wird nicht verwendet, entfernt, um den Import sauber zu halten
import { Minimize, Maximize, Menu, X, Pin, PinOff } from 'lucide-vue-next'; // Pin/PinOff hinzugefügt
import { useResizableAndDraggable, ElementState } from '../composables/useDraggable';

const usertext: Ref<string>= ref('');

// --- Titel-Logik ---
const noteTitel: Ref<string> = ref('Meine Notiz');
const isEditingTitle = ref(false);
const titelInputRef = ref<HTMLInputElement | null>(null);

function startEditingTitle() {
  isEditingTitle.value = true;
  closeMenu(); // Menü schließen, falls offen
  // Nächsten Tick abwarten, bis das Input im DOM ist
  nextTick(() => {
    titelInputRef.value?.focus();
    titelInputRef.value?.select();
  });
}

function stopEditingTitle() {
  isEditingTitle.value = false;
  // Fallback, falls Titel leer ist
  if (!noteTitel.value.trim()) {
    noteTitel.value = 'Meine Notiz';
  }
}



const menuIsn = ref(true);
const menuButtonWrapperRef = ref<HTMLElement | null>(null);

function toggleMenu() {
  menuIsn.value = !menuIsn.value;
}
function closeMenu() {
  menuIsn.value = true;
}

watch(menuIsn, (isOpenN) => { // isOpenN = menuIsn
  if (!isOpenN) {
    document.addEventListener('mousedown', handleClickOutsideMenu, true);
  } else {
    document.removeEventListener('mousedown', handleClickOutsideMenu, true);
  }
});

const handleClickOutsideMenu = (event: MouseEvent) => {
  if (menuButtonWrapperRef.value && !menuButtonWrapperRef.value.contains(event.target as Node)) {
    closeMenu();
  }
};

// Listener aufräumen, falls Komponente zerstört wird
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutsideMenu, true);
});


// --- Pin-Logik ---
const isPinned = ref(false);
function togglePin() {
  isPinned.value = !isPinned.value;
}


// --- Dragging und Resizing ---

const props = withDefaults(defineProps<{
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
}>(), {
  initialX: 50,
  initialY: 50,
  initialWidth: 400,
  initialHeight: 300,
});

// DOM-Referenzen
const popupRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);

// Anfangszustand definieren
const initialState: ElementState = {
  x: props.initialX,
  y: props.initialY,
  width: props.initialWidth,
  height: props.initialHeight
};

// Anwendung des Composables (isPinned übergeben)
const { draggableStyle, isFullscreen, toggleFullscreen } = useResizableAndDraggable(
    popupRef,
    headerRef,
    isPinned, // NEU: Pin-Status übergeben
    initialState
);
</script>

<style scoped>
.draggable-resizable-popup {
  background: white;
  border: none;
  border-radius: 8px;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.3s ease;
}

/* NEU: Pinned-Zustand */
.draggable-resizable-popup.is-pinned .popup-header {
  background-color: var(--bg-pinned, #055a8a); /* Dunkleres Blau für Pinned */
}
.draggable-resizable-popup.is-pinned {
  box-shadow: 0 10px 35px rgba(5, 90, 138, 0.4); /* Stärkerer Schatten */
}

.fullscreen-mode {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.popup-header {
  background-color: var(--bg, #3b82f6);
  color: white;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  cursor: grab;
  transition: background-color 0.3s ease; /* Für Pin-Farbwechsel */
  height: 50px;
}
.is-pinned .popup-header {
  cursor: default; /* Kein Grab-Cursor, wenn gepinnt */
}

/* Titel und Titel-Input */
.titel{
  color: white;
  flex-grow: 1;
  text-align: center;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 80px;
  margin-right: 80px;
}
.titel:hover {
  background-color: rgba(255, 255, 255, 0.08);
  cursor: text;
}

.titel-input {
  flex-grow: 1;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  color: white;
  font-weight: bold;
  font-size: 1em; /* Stellt Schriftgröße sicher */
  font-family: inherit; /* Stellt Schriftart sicher */
  padding: 4px 8px;
  outline: none;
  margin: 0 4px; /* Verhindert Überlappung */

}
.titel-input:focus {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: white;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
}

/* NEU: Titel Edit Transition */
.titel-edit-enter-active,
.titel-edit-leave-active {
  transition: all 0.15s ease-out;
}
.titel-edit-enter-from,
.titel-edit-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.titel-edit-enter-to,
.titel-edit-leave-from {
  opacity: 1;
  transform: translateY(0);
}


/* Container für alle Optionen (Pin, Menu, Fullscreen) */
.options-container {
  display: flex;
  align-items: center;
  margin-left: auto; /* Sorgt dafür, dass sie rechts bleiben */
}

/* NEU: Basis-Styling für alle Header-Icon-Buttons */
.header-icon-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  flex-shrink: 0; /* Verhindert Stauchen */
}
.header-icon-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Spezifische Anpassungen */
.pin-button {
  margin-right: 4px;
}
.fullscreen-button {
  margin-left: 7px;
}
.options-menu-icon {
  width: 20px;
  height: 20px;
}


/* Wrapper für den Menü-Button und das Dropdown */
.menu-button-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 4px;
}
/* Hover-Effekt jetzt auf dem .header-icon-button */


/* DROP-DOWN MENÜ STYLES */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
  margin-top: 8px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 4px 0;
  transform-origin: top right;
  overflow: hidden;
}

.menu-item {
  padding: 8px 16px;
  color: #333;
  cursor: pointer;
  font-weight: normal;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: #f0f4f8;
}

.menu-item-danger {
  color: #ef4444;
}
.menu-item-danger:hover {
  background-color: #fee2e2;
}

/* NEU: Menü-Trenner */
.menu-separator {
  height: 1px;
  background-color: #e5e7eb; /* Helles Grau */
  margin: 4px 0;
}

/* TRANSITION STYLES (Dropdown) */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out;
}
.dropdown-enter-from,
.dropdown-leave-to {
  transform: scale(0.8);
  opacity: 0;
}
.dropdown-enter-to,
.dropdown-leave-from {
  transform: scale(1);
  opacity: 1;
}

/* Hauptinhalt */
.popup-content {
  padding: 15px;
  height: calc(100% - 40px);
  overflow: auto;
}
.popup-contents {
  margin: 0;
  background: transparent;
  height: 100%;
  width: 100%;
  color: black;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}
</style>
