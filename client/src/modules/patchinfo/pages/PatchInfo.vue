<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Types ---
interface ChangeLogItem {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string; // Changed to string to support HTML structure
}

// --- Mock Data ---
const updates: ChangeLogItem[] = [
  {
    "version": "v1.0.0",
    "date": "5. Januar 2025",
    "title": "Release",
    "description": "Offizieller Release für das Schul Dashboard.",
    "changes": `
      <h1>Features</h1>
        <h2>Dashboard</h2>
          <h3>Einträge</h3>
            <p>Unter den Kategorien Hausaufgaben, Dalton und Prüfungen können schulische Aufgaben hochgeladen werden</p>
            <p>Jeder mit einem Account kann beitragen</p>
            <p>Alle Einträge sind für jeden Nutzer jederzeit einsehbar</p>
            <p>Fach, (Abgabe-)Datum, und Beschreibung helfen alles zu organisieren</p>
          <h3>Bilder</h3>
            <p>Zu jedem Eintrag können Bilder hochgeladen werden</p>
            <p>Jeder mit einem Account kann bei allen Einträgen Bilder hinterlegen</p>
            <p>Notizen, Lernzettel, usw. können organisiert geteilt werden</p>
          <h3>Fortschritt verfolgen</h3>
            <p>Wer einen Account hat, kann erledigt Einträge abhaken</p>
            <p>Fortschritt wird in der Cloud gespeichert</p>
            <p>Abgeschlossene Einträge werden eingeklappt, um das Dashboard sauber zu halten</p>
          <h3>Private Einträge</h3>
            <p>Für private Todos, die nur dich angehen, können private Einträge erstellt werden</p>
            <p>Diese sind sicher verschlüsselt und nur für deinen Account sichtbar</p>
            <p>Auch diese können, nachdem sie erledigt sind, abgehakt werden</p>
          <h3>Personalisierte Kurse</h3>
            <p>Wer einen Account hat, kann in den Einstellungen seine Kurse hinterlegen</p>
            <p>Einträge, die als Fach einen nicht belegten Kurs haben, werden ausgeblendet</p>
            <p>Die Option kann in Einstellungen deaktiviert werden</p>
            <p>Die Kursauswahl kann dort ebenfalls bearbeitet werden</p>
          <h3>Eintragsarchiv</h3>
            <p>Einträge ,die älter als 24 Stunden sind werden ausgeblendet: aktuelle Aufgaben bleiben übersichtlich</p>
            <p>Alte Einträge können 30 Tage lang im Eintragsarchiv eingesehen werden</p>
            <p>Wer gefehlt hat, kann herausfinden was nachgeholt werden muss</p>
            <p>Prüfungsrelevante Aufträge bleiben auch für einen Test zu einem späteren Zeitpunkt erhalten</p>

        <h2>Stundenplan</h2>
          <h3>Digitale Version</h3>
            <p>Papierstundenplan ist nicht mehr nötig</p>
            <p>Infos sind innerhalb von wenigen Klicks einsehbar</p>
          <h3>Live-Änderungen</h3>
            <p>Vertretung, Ausfall, Raumänderungen usw. werden zeitnah übertragen</p>
            <p>Änderungen sind sofort im digitalen Stundenplan sichtbar</p>
            <p>Mehrere Ressourcen sind nicht mehr nötig</p>
            <p>Auch z. B. Wandertage oder geplanter Unterrichtsentfall die nur mündlich angekündigt wurden, können übersichtlich eingetragen werden</p>

        <h2>Daltonraumfinder</h2>
          <h3>Raumsuche</h3>
            <p>Dank digitaler Version des Raumplans muss kein nerviger Zettel mehr mitgeführt werden</p>
            <p>Suchfunktion erlaubt es in wenigen Sekunden hearuszufinden, wer an welchem Tag im Wunschraum ist</p>
            <p>Fächer der dort unterrichtenden Lehrer*innen werden praktisch angezeigt, um eine bessere Planung zu ermöglichen</p>
          <h3>Lehrer*innensuche</h3>
            <p>Bei dem Wunsch, eine/n spezifischen Lehrer*in zu finden, kann über die Suchleiste der Raumplan nach dem Namen oder Fach gesucht werden</p>
            <p>Jede/r Lehrer*in wird übersichtlich mit dem jeweiligen Raum für jeden Wochentag und ihren Fächern angezeigt</p>

        <h2>Kürzelfinder</h2>
          <h3>Kürzelübersetzer</h3>
            <p>Unbekanntes Kürzel kann hier eingegeben werden</p>
            <p>Kürzel wird übersetzt und der dazugehörige Name wird angezeigt</p>
          <h3>Kürzelfinder</h3>
            <p>Wenn das Kürzel zum Namen unbekannt ist, kann der Modus gewechselt werden</p>
            <p>Name wird in passendes Kürzel umgewandelt</p>

        <h2>Sorgenbox</h2>
          <p>Beschwerden oder Sachen, die einen bedrücken können, in das Textfeld eingetragen werden</p>
          <p>Die Nachricht wird anonym an die Betreiber übermittelt</p>
          <p>Wer etwas sagen will, aber seine Identität nicht preisgeben will, kann hier alles abgeben</p>
          <p>Falls gewünscht, können die Betreiber die Person kontaktieren oder etwas gegen die Beschwerde unternehmen</p>

        <h2>Verschiedenes</h2>
          <h3>Countdown</h3>
            <p>Countdown bis zu den Sommerferien</p>
            <p>Einheit kann zu Millisekunden, Minuten, Wochen, etc. geändert werden</p>
          <h3>Ankündigungen</h3>
            <p>Wenn etwas wichtiges passiert, über das informiert werden muss, die Situation aber als Eintrag keinen Sinn ergibt können Admins seitenweite Ankündigungen erstellen0</p>
            <p>Eine Leiste mit der Nachricht wird auf der ganzen Seite für alle angezeigt</p>
            <p>bei mehreren Ankündigungen kann zwischen den Nachrichten gewechselt werden ,indem man auf die Leiste tippt</p>
            <p>Durch Farbcodierung (etwa grau für eine kleine Erinnerung und rot für kurzfristigen Unterrichtsausfall) kann die Dringlichkeit ermittelt werden</p>
    `
  },
  {
    "version": "v1.0.1",
    "date": "6. Januar 2025",
    "title": "Post-Release Patches",
    "description": "Private Einträge Redesign und einige Bugs behoben.",
    "changes": `
      <h2>Private Einträge</h2>
        <h3>Redesign</h3>
          <p>Übersichtlicheres Layout</p>
          <p>Stil aktualisiert</p>
          <p>Animation für Abhaken verbessert</p>
        <h3>Funktionalität</h3>
          <p>Ladezeiten drastisch reduziert</p>
          <p>Fälligkeitsdatum entfernt</p>
          <p>Abhaken verbessert</p>
          <p>Zeichenlimit für Beschreibung auf 2000 erhöht</p>
      <h2>Fixes</h2>
        <h3>Bugs</h3>
          <p>Anmeldestatus-Verwaltungs-Fehler behoben</p>
          <p>Falsche Farbwerte im hellen Theme korrigiert</p>
        <h3>Verbesserungen</h3>
          <p>Infotexte verbessert und präzisiert</p>
    `
  },
];

// --- State ---
const searchQuery = ref('');
const selectedVersion = ref<string>(updates[0].version);
const showMobileList = ref(true); // Steuert die Ansicht auf Mobile

// --- Computed ---
const filteredUpdates = computed(() => {
  if (!searchQuery.value) return updates;

  const query = searchQuery.value.toLowerCase();
  return updates.filter(u =>
      u.version.toLowerCase().includes(query) ||
      u.title.toLowerCase().includes(query)
  );
});

const currentUpdate = computed(() => {
  return updates.find(u => u.version === selectedVersion.value) || updates[0];
});

// --- Actions ---
const selectUpdate = (version: string) => {
  selectedVersion.value = version;
  // Auf Mobile zur Detailansicht wechseln
  showMobileList.value = false;
};

const backToList = () => {
  showMobileList.value = true;
};
</script>

<template>
  <div class="update-history-container">

    <aside class="sidebar" :class="{ 'hidden-mobile': !showMobileList }">
      <div class="search-wrapper">
        <div class="search-input-container">
          <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
              v-model="searchQuery"
              type="text"
              placeholder="Versionen durchsuchen..."
              class="search-input"
          />
        </div>
      </div>

      <div class="version-list">
        <div
            v-for="update in filteredUpdates"
            :key="update.version"
            class="version-item"
            :class="{ 'active': selectedVersion === update.version }"
            @click="selectUpdate(update.version)"
        >
          <div class="version-header">
            <span class="version-tag">{{ update.version }}</span>
            <span class="version-date">{{ update.date }}</span>
          </div>
          <p class="version-title-preview">{{ update.title }}</p>
        </div>

        <div v-if="filteredUpdates.length === 0" class="no-results">
          Keine Updates gefunden.
        </div>
      </div>
    </aside>

    <main class="content-area" :class="{ 'hidden-mobile': showMobileList }">

      <button class="mobile-back-btn" @click="backToList">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Zurück zur Übersicht
      </button>

      <div class="content-card">
        <div class="content-header">
          <div>
            <h1 class="main-title">{{ currentUpdate.version }}</h1>
            <h2 class="sub-title">{{ currentUpdate.title }}</h2>
          </div>
          <span class="header-date">{{ currentUpdate.date }}</span>
        </div>

        <div class="divider"></div>

        <div class="content-body">
          <p class="description">{{ currentUpdate.description }}</p>

          <h3 class="changes-heading">Änderungen</h3>
          <div class="changes-content" v-html="currentUpdate.changes"></div>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
/* --- Layout --- */
.update-history-container {
  display: flex;
  width: 100%;
  height: 100vh; /* Fixed height container to allow internal scrolling */
  overflow: hidden;
}

/* --- Sidebar --- */
.sidebar {
  width: 300px;
  background-color: var(--bg-canvas); /* Fallback color added */
  border-right: 1px solid var(--border-surface);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
}

.search-wrapper {
  padding: 16px;
  border-bottom: 1px solid var(--border-surface);
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--sub);
}

.search-input {
  width: 100%;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  color: var(--text-default);
  padding: 8px 12px 8px 36px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.version-list {
  overflow-y: auto;
  flex: 1;
}

/* Custom Scrollbar */
.version-list::-webkit-scrollbar {
  width: 6px;
}
.version-list::-webkit-scrollbar-thumb {
  background-color: var(--bg-surface);
  border-radius: 3px;
}

.version-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-canvas);
  color:var(--text-default);
}

.version-item:hover {
  background-color: var(--bg-surface);
}

.version-item.active {
  background-color: var(--text-default);
  color:var(--bg-canvas);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.version-tag {
  font-weight: 700;
  font-size: 0.95rem;
}

.version-date {
  font-size: 0.75rem;
}

.version-title-preview {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: var(--sub);
  font-size: 0.9rem;
}

/* --- Right Content Area --- */
.content-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  height: 100%;
}

.content-card {
  border-radius: 16px;
  padding: 16px;
  border: none;
  max-width: 1000px;
  margin: 0 auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.main-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-default);
}

.sub-title {
  margin: 4px 0 0 0;
  font-size: 1.1rem;
  font-weight: 400;
  color: var(--sub);
}

.header-date {
  font-size: 0.9rem;
  color: var(--text-default);
  background-color: var(--bg-interactive-hover);
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.divider {
  height: 1px;
  background-color: var(--bg-interactive-hover);
  margin: 16px 0;
}

.description {
  line-height: 1.6;
  color: var(--text-default);
  margin-bottom: 24px;
}

.changes-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sub);
  margin-bottom: 12px;
}

/* --- Changes Content (Deep Styling) --- */
/* Reset margin for the container */
.changes-content {
  color: var(--text-default);
}

/* Style injected Headings */
.changes-content :deep(h1),
.changes-content :deep(h2),
.changes-content :deep(h3),
.changes-content :deep(h4) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-default);
}

.changes-content :deep(h1) { font-size: 2rem; margin-block: 0.5rem; }
.changes-content :deep(h2) { font-size: 1.5rem; margin-top: 2.5rem; }
.changes-content :deep(h3) { font-size: 1.2rem; margin-top: 1rem; }

/* Style injected Paragraphs as Bullet Points */
.changes-content :deep(p) {
  position: relative;
  padding-left: 20px;
  margin-bottom: 8px;
  margin-top: 0;
  line-height: 1.5;
  color: var(--text-default);
}

.changes-content :deep(p)::before {
  content: "•";
  color: var(--sub);
  font-weight: bold;
  position: absolute;
  left: 0;
}

/* --- Mobile Specifics --- */
.mobile-back-btn {
  display: none; /* Hidden on desktop */
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--sub);
  font-size: 1rem;
  margin-bottom: 12px;
  cursor: pointer;
  padding: 0;
}

/* --- RESPONSIVE MEDIA QUERIES --- */
@media (max-width: 768px) {
  .update-history-container {
    flex-direction: column;
    height: 100vh; /* Use dynamic viewport height if possible, else 100vh */
  }

  /* Hide elements based on state */
  .sidebar.hidden-mobile,
  .content-area.hidden-mobile {
    display: none;
  }

  .sidebar {
    width: 100%;
    border-right: none;
  }

  .content-area {
    width: 100%;
    padding: 12px;
  }

  .mobile-back-btn {
    display: flex;
  }

  .content-card {
    border: none;
    padding: 0;
    background: transparent;
  }

  .main-title {
    font-size: 1.5rem;
  }

  .header-date {
    font-size: 0.8rem;
  }
}
</style>