<template>
  <div class="schedule-card card">
    <!-- Image container mit Ref für Vollbildkontrolle -->
    <div ref="scheduleContainer" class="schedule-container" @dblclick="toggleFullscreen">
      <img
          :src="scheduleImagePath"
          alt="Aktueller Zeitplan der Arbeit"
          class="schedule-image"
      />

      <!-- Vollbild-Schaltfläche (liegt über dem Bild) -->
      <button
          class="btn fullscreen-btn"
          :class="{ 'ghost': !isFullscreen }"
          @click="toggleFullscreen"
          :title="isFullscreen ? 'Vollbild beenden (Esc)' : 'Vollbild anzeigen'"
      >
        <!-- Icon: Expand / Shrink -->
        <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 8 4 4 8 4"></polyline><line x1="4" y1="4" x2="10" y2="10"></line><polyline points="16 4 20 4 20 8"></polyline><line x1="14" y1="10" x2="20" y2="4"></line><polyline points="16 20 20 20 20 16"></polyline><line x1="14" y1="14" x2="20" y2="20"></line><polyline points="8 20 4 20 4 16"></polyline><line x1="4" y1="20" x2="10" y2="14"></line>
        </svg>
        <span class="ml-2">{{ isFullscreen ? 'Vollbild beenden' : 'Vollbild anzeigen' }}</span>
      </button>
    </div>

    <p class="small mt-4">
      Stundenplan
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const scheduleImagePath = new URL('../assets/plan.png', import.meta.url).href;

const scheduleContainer = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);


const toggleFullscreen = () => {
  const container = scheduleContainer.value;

  if (!container) return;

  if (!document.fullscreenElement) {
    // Vollbild anfordern
    container.requestFullscreen().catch(err => {
      console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
      // Zeigt bei Bedarf eine benutzerdefinierte Fehlermeldung an
    });
  } else {
    // Vollbild beenden
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};


const handleFullscreenChange = () => {
  // Überprüfen, ob unser Container das Element im Vollbildmodus ist
  isFullscreen.value = document.fullscreenElement === scheduleContainer.value;

  // Klasse hinzufügen/entfernen für das spezifische Vollbild-Styling
  if (scheduleContainer.value) {
    if (isFullscreen.value) {
      scheduleContainer.value.classList.add('is-fullscreen-active');
    } else {
      scheduleContainer.value.classList.remove('is-fullscreen-active');
    }
  }
};

// Event-Listener für Vollbildänderungen beim Mounten registrieren
onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

// Event-Listener beim Unmounten bereinigen
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style scoped>
.schedule-card {
  /* Setzt die Karte auf eine schöne, große Breite */
  max-width: 100%;
  margin: 32px auto;
  background: var(--card); /* Nutzt die --card-Variable */
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.schedule-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in; /* Zeigt an, dass das Element interaktiv ist */
  background-color: var(--bg); /* Dunkler Hintergrund, falls das PNG Transparenz hat */
  /* Die minimale Höhe ist wichtig, damit das Bild nicht zu klein wird, wenn der Platzhalter sehr schmal ist */
  min-height: 200px;
}

/* Styling des Bildes im normalen Modus */
.schedule-image {
  display: block;
  width: 100%;
  height: auto;
}

/* Vollbild-Schaltfläche (schwebt über dem Bild) */
.fullscreen-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  /* Verwendung der globalen Klassen .btn, aber mit spezifischem Hintergrund */
  background: rgba(40, 40, 40, 0.8);
  color: var(--text);
  border: 1px solid var(--jj);
  transition: background 0.2s, opacity 0.3s;
  display: flex;
  align-items: center;
  /* Verstecke den Knopf kurz nach dem Vollbild-Request, um Ablenkung zu vermeiden */
  opacity: 1;
}

/* Im Vollbildmodus ist der Knopf etwas prominenter */
.is-fullscreen-active .fullscreen-btn {
  opacity: 1;
  background: rgba(26, 26, 26, 0.95);
  color: var(--text);
  padding: 12px 16px;
}

.fullscreen-btn.ghost:hover {
  background: rgba(50, 50, 50, 0.9);
}

/* Styling, das NUR angewendet wird, wenn der Container im nativen Vollbildmodus ist */
.is-fullscreen-active {
  width: 100vw;
  height: 100vh;
  background-color: var(--bg); /* Füllt den gesamten Bildschirmhintergrund */
  border-radius: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Bild-Anpassung im Vollbildmodus */
.is-fullscreen-active .schedule-image {
  width: auto;
  height: 100%; /* Füllt die Höhe, während das Seitenverhältnis beibehalten wird */
  max-width: 100%; /* Begrenzt die Breite auf den Bildschirm */
  object-fit: contain; /* Stellt sicher, dass das gesamte Bild sichtbar ist */
}
</style>
