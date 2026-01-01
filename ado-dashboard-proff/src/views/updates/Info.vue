<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Types ---
interface ChangeLogItem {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
}

// --- Mock Data ---
const updates: ChangeLogItem[] = [
  {
    "version": "v1.0",
    "date": "15. Dezember 2025",
    "title": "Version 1.0: Offizieller Start des Schul-Dashboards",
    "description": "Diese Version markiert den ersten stabilen und funktionsreichen Release des Schul-Dashboards. Der Fokus liegt auf einem robusten System zur Organisation des Schulalltags, umfassenden administrativen Werkzeugen und einer sicheren, nutzerfreundlichen Plattform. Alle hier genannten Funktionen sind vollständig implementiert und getestet.",
    "changes": [
      "**Kontoverwaltung & Sicherheit:**",
      "  - Implementierung eines vollständigen Authentifizierungssystems: Nutzer können sich registrieren, anmelden, abmelden und ihr Passwort ändern.",
      "  - Zur Erhöhung der Kontosicherheit ist eine E-Mail-Verifizierung nach der Registrierung zwingend erforderlich.",
      "  - Die Funktion \"Passwort vergessen\" ermöglicht das sichere Zurücksetzen des Passworts via E-Mail.",
      "  - Verbesserte Sicherheitsmaßnahmen zum Schutz vor unbefugten Aktionen (CSRF-Schutz) bei allen Formulareingaben.",
      "  - Nutzer haben die Möglichkeit, sich von allen Geräten gleichzeitig abzumelden, um die Kontrolle über ihr Konto zu behalten.",
      "",
      "**Dashboard für Hausaufgaben, Klausuren & Infos:**",
      "  - Eine zentrale, einheitliche Ansicht zur Anzeige und Verwaltung aller schulischen Einträge.",
      "  - Nutzer können Einträge der Kategorien Hausaufgaben, Klausuren und Informationen erstellen, bearbeiten und löschen.",
      "  - Einträge können mit Fälligkeitsdatum, Fach und einer detaillierten Beschreibung (unterstützt Markdown-Formatierung) versehen werden.",
      "  - Eine Filterfunktion ermöglicht die gezielte Anzeige von Einträgen nach Fach, Status (erledigt/offen) oder Typ.",
      "  - Alle von Nutzern erstellten Inhalte werden serverseitig bereinigt, um die Plattform vor Cross-Site-Scripting (XSS) zu schützen.",
      "",
      "**Persönliche Organisation & Benutzeroberfläche:**",
      "  - Eine integrierte, private To-do-Liste erlaubt es Nutzern, persönliche Aufgaben unabhängig von den öffentlichen Einträgen zu verwalten.",
      "  - Die gesamte Benutzeroberfläche ist in einem hellen und einem dunklen Design (Light/Dark Mode) verfügbar.",
      "  - Ein Cookie-Banner klärt über die Verwendung von Cookies auf und holt die Zustimmung der Nutzer ein. Die Präferenzen können jederzeit angepasst werden.",
      "  - Ein System für Benachrichtigungen gibt direktes Feedback über erfolgreiche Aktionen oder Fehler.",
      "",
      "**Administrative Werkzeuge:**",
      "  - **Umfassende Benutzerverwaltung:** Administratoren können alle registrierten Nutzer auflisten, deren Status (aktiv, gesperrt) einsehen, Konten temporär sperren/entsperren und bei Bedarf permanent löschen.",
      "  - **Aktivitätsprotokoll:** Detaillierte Einsicht in die letzten Aktivitäten einzelner Nutzer zur Nachverfolgung von Aktionen und zur Verbesserung der Sicherheit.",
      "  - **Verwaltung von Stundenplan-Änderungen:** Ein dediziertes Werkzeug zur Erfassung und Anzeige von Vertretungen, Raumänderungen oder Stundenausfällen.",
      "  - **System für gemeldete Inhalte:** Nutzer können unangemessene Einträge melden. Administratoren können diese Meldungen in einer separaten Ansicht prüfen und die entsprechenden Inhalte entfernen.",
      "  - **Sorgenbox:** Eine vertrauliche Funktion, über die Nutzer Anliegen oder Probleme direkt an die Administration melden können.",
      "  - **Globale Ankündigungen:** Administratoren können wichtige Mitteilungen erstellen, die prominent für alle Nutzer auf dem Dashboard angezeigt werden.",
      "  - **Sicherheits-Reporting:** Möglichkeit zur Generierung eines automatisierten Berichts, der sicherheitsrelevante Systemstatistiken und Aktivitäten zusammenfasst."
    ]
  }
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
              placeholder="Search versions..."
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
          No updates found.
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

          <h3 class="changes-heading">Changelog</h3>
          <ul class="changes-list">
            <li v-for="(change, index) in currentUpdate.changes" :key="index">
              {{ change }}
            </li>
          </ul>
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
  background-color: var(--lbg); /* Fallback color added */
  border-right: 1px solid var(--border2);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
}

.search-wrapper {
  padding: 16px;
  border-bottom: 1px solid var(--border2);
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
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 10px 12px 10px 36px;
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
  background-color: var(--vlbg);
  border-radius: 3px;
}

.version-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  color:var(--text);
}

.version-item:hover {
  background-color: var(--vlbg);
}

.version-item.active {
  background-color: var(--text);
  color:var(--bg);
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
  border: 1px solid var(--border2);
  max-width: 900px;
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
  color: var(--text);
}

.sub-title {
  margin: 4px 0 0 0;
  font-size: 1.1rem;
  font-weight: 400;
  color: var(--sub);
}

.header-date {
  font-size: 0.9rem;
  color: var(--text);
  background-color: var(--gg);
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.divider {
  height: 1px;
  background-color: var(--gg);
  margin: 16px 0;
}

.description {
  line-height: 1.6;
  color: var(--text);
  margin-bottom: 24px;
}

.changes-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sub);
  margin-bottom: 12px;
}

.changes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.changes-list li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 8px;
  line-height: 1.5;
  color: var(--text);
}

.changes-list li::before {
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