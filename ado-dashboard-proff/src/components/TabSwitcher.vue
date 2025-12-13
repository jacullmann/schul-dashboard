<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

// -- Types --
// Die Struktur eines Navigations-Elements
interface NavItem {
  id: string;      // Eindeutiger Bezeichner (z.B. 'posts', 'settings', 'user-123')
  label: string;   // Der im UI angezeigte Text
}

// -- Props --
const props = withDefaults(defineProps<{
  // Die Liste der Tab-Elemente, die angezeigt werden sollen
  items: NavItem[];
  // Die ID des aktuell aktiven Tabs
  activeId: string;
}>(), {
  items: () => [],
  activeId: ''
});

// -- Emits --
const emit = defineEmits<{
  (e: 'change', id: string): void
}>();

// -- Interne Daten --
const itemRefs = ref<(HTMLElement | null)[]>([]);
const navBarRef = ref<HTMLElement | null>(null);
const navBarScrollWidth = ref(0);
const resizeObserver = ref<ResizeObserver | null>(null);

// Findet den Index des aktiven Tabs basierend auf der activeId Prop
const selectedIndex = ref(
    props.items.findIndex(item => item.id === props.activeId)
);

// Überwacht externe Änderungen der activeId Prop
watch(() => props.activeId, (newId) => {
  const index = props.items.findIndex(item => item.id === newId);
  if (index !== -1) {
    selectedIndex.value = index;
    // Verzögere das Scrollen bis das DOM aktualisiert wurde
    nextTick(() => {
      scrollToActive();
    });
  }
}, { immediate: true }); // Führe die Prüfung sofort beim Laden durch

// Überwacht Änderungen in der 'items' Liste (falls sich die Tabs dynamisch ändern)
watch(() => props.items, (newItems) => {
  // Aktualisiere den Index, falls die aktive ID noch existiert
  const index = newItems.findIndex(item => item.id === props.activeId);
  selectedIndex.value = index !== -1 ? index : 0; // Setze den ersten Tab als aktiv, falls der alte nicht mehr existiert
  nextTick(() => {
    updateMetrics(); // Aktualisiere die Breiten und Positionen
    scrollToActive();
  });
});

// -- Berechnete Styles (Logik für die "Pille") --

// 1. Geometrie der Highlight-Pille
const pillStyle = computed(() => {
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return { opacity: 0 };

  return {
    width: `${targetElement.offsetWidth}px`,
    transform: `translateX(${targetElement.offsetLeft}px)`,
    opacity: 1,
  };
});

// 2. Geometrie der Inneren Liste (für den "Maskierungseffekt" des Textes)
const innerListStyle = computed(() => {
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return {};

  return {
    // Stellt sicher, dass die innere Liste die gesamte Breite des Scroll-Containers hat
    width: `${navBarScrollWidth.value}px`,
    // Verschiebt die innere Liste entgegengesetzt zur Pille, um den Text im Viewport zu halten
    transform: `translateX(-${targetElement.offsetLeft}px)`,
  };
});

// -- Methoden --
const updateMetrics = () => {
  if (navBarRef.value) {
    // scrollWidth erfasst die gesamte Breite des Inhalts, auch außerhalb des sichtbaren Bereichs
    navBarScrollWidth.value = navBarRef.value.scrollWidth;
  }
};

const selectItem = (index: number) => {
  selectedIndex.value = index;
  // Emittiere die ID des ausgewählten Tabs
  emit('change', props.items[index].id);
  // Sorge dafür, dass der ausgewählte Tab im sichtbaren Bereich ist
  nextTick(() => {
    scrollToActive();
  });
};

const scrollToActive = () => {
  const target = itemRefs.value[selectedIndex.value];
  if (target && navBarRef.value) {
    // Scrollt zum aktiven Element (sanft und mittig)
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

// -- Lifecycle --
onMounted(() => {
  // Erstberechnung
  updateMetrics();

  // ResizeObserver für responsive Anpassung (falls sich die verfügbare Breite ändert)
  if (navBarRef.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateMetrics();
      scrollToActive(); // Wichtig: Nach Größenänderung zum aktiven Tab scrollen
    });
    resizeObserver.value.observe(navBarRef.value);
  }

  // Fallback für verzögertes Laden von Schriftarten/Layouts
  setTimeout(updateMetrics, 100);
});

onBeforeUnmount(() => {
  // Observer bei Zerstörung der Komponente entfernen
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
});
</script>

<template>
  <div class="wrapper">
    <nav class="nav-bar" ref="navBarRef" role="tablist">

      <!-- 1. Hintergrund-Layer (Nicht aktive Buttons und Klick-Ziele) -->
      <!-- WICHTIG: Dieser Layer muss über der Highlight-Pille liegen,
           damit die Buttons klickbar sind. Die Highlight-Pille erhält pointer-events: none,
           liegt aber im DOM HINTER diesem Layer, weshalb er z-index: 3 benötigt. -->
      <div class="nav-layer background-layer">
        <button
            v-for="(item, index) in items"
            :key="item.id"
            :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
            class="nav-item is-clickable"
            :class="{ 'is-active': item.id === activeId }"
            @click="selectItem(index)"
            role="tab"
            :aria-selected="item.id === activeId ? 'true' : 'false'"
            :data-tab-id="item.id"
            :title="item.label"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 2. Highlight-Pille (Der verschiebbare Hintergrund) -->
      <!-- Die Pille liegt jetzt ZWISCHEN dem klickbaren Layer und dem aktiven Text-Layer -->
      <div class="highlight-pill" :style="pillStyle" aria-hidden="true">

        <!-- 3. Vordergrund-Layer (Aktiver Text in Invers-Farbe) -->
        <div class="nav-layer foreground-layer" :style="innerListStyle">
          <div
              v-for="item in items"
              :key="item.id + '-fg'"
              class="nav-item active-text"
              aria-hidden="true"
          >
            {{ item.label }}
          </div>
        </div>

      </div>
    </nav>
  </div>
</template>

<style scoped>
/*
 * Dieses Styling ist direkt aus deiner Originaldatei übernommen.
 * Die Farbanpassungen wurden vorgenommen, um die Schriftfarblogik von TabNavigation.vue zu übernehmen.
 */

/* -- Reset -- */
* {
  box-sizing: border-box;
}

/* -- Wrapper -- */
.wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

/* -- The Bar Container -- */
.nav-bar {
  position: relative;
  /* Farben von style.css */
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  padding: 0;
  border-radius: 6px;
  display: flex;
  isolation: isolate;
  /* Scrollverhalten (für überlaufende Tabs) */
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Scrollbar für Chrome/Safari ausblenden */
.nav-bar::-webkit-scrollbar {
  display: none;
}

/* -- Shared Layer Styles -- */
.nav-layer {
  display: flex;
  align-items: center;
  height: 100%;
  /* Stellt sicher, dass die Ebenen nicht umbrechen oder schrumpfen */
  width: max-content;
}

/* Hintergrund-Ebene: Hält die klickbaren Buttons */
.background-layer {
  position: relative;
  /* Setzen Sie einen höheren z-index als die Pille, damit die Buttons klickbar sind */
  z-index: 3;
}

/* Vordergrund-Ebene: Innerhalb der Pille, hält den aktiven Text */
.foreground-layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none; /* Macht diese Ebene nicht klickbar */
  /* Die Transition muss mit der Pill-Transition übereinstimmen */
  transition: transform .4s cubic-bezier(0.075, 0.82, 0.165, 1);
}

/* -- Die Gleitende Pille (Highlight-Effekt) -- */
.highlight-pill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--text); /* Farbe für den aktiven Hintergrund (Hell) */
  border-radius: 5px;
  /* Muss unter dem klickbaren Layer (z-index: 3) liegen */
  z-index: 2;
  overflow: hidden;
  pointer-events: none; /* Wichtig: Macht die Pille transparent für Klick-Events */
  transition: all 0.4s cubic-bezier(0.075, 0.82, 0.165, 1);
}

/* -- Die Buttons (Gemeinsames Styling) -- */
.nav-item {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 12px;
  font-size: 14px;
  border-radius: 6px;
  /* Standard-Textfarbe (nicht aktiv) */
  color: var(--sub);
  white-space: nowrap; /* Verhindert Zeilenumbruch */
  flex-shrink: 0; /* Verhindert das Zusammendrücken der Elemente */
  transition: color 0.2s ease;
}

.nav-item:hover {
  /* Hover-Effekt (Hell, sichtbar auf dunklem Hintergrund) */
  color: var(--text);
}

/* Korrektur: Wir aktivieren die Klicks auf den Buttons im Background-Layer */
.nav-layer .nav-item {
  /* Setzt den Cursor wieder auf den Standard-Button-Cursor */
  cursor: pointer;
  /* Wichtig: Ermöglicht Klick-Events auf den Buttons im Background-Layer */
  pointer-events: auto;
}

/* ** WICHTIGSTE FEHLENDE REGEL: Text des aktiven Buttons ausblenden ** */
/* Wenn ein Button aktiv ist, muss sein Text im Background-Layer unsichtbar sein,
   damit der dunkle Text aus dem Foreground-Layer durchscheint. */
.background-layer .nav-item.is-active {
  color: transparent;
}

.background-layer .nav-item.is-active:hover {
  color: transparent; /* Verhindert, dass der Hover-Effekt die Transparenz aufhebt */
}

/* -- ANPASSUNG FÜR DEN AKTIVEN TEXT (im Vordergrund) -- */
/* Der Text im Foreground-Layer (der sich mit der Pille bewegt) soll NICHT klickbar sein */
.foreground-layer .nav-item.active-text {
  cursor: default;
  pointer-events: none;
  /* Korrigierte Farbe: Dunkle Farbe (--lbg) für den hellen Hintergrund der Pille (--text) */
  color: var(--lbg);
}
</style>