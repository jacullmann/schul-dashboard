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
    "date": "voraussichtlich 5. Januar 2025",
    "title": "Version 1.0: Offizieller Start des Schul-Dashboards",
    "description": "Dies ist die erste offizielle Version des Schul-Dashboards. Der Fokus liegt auf einem robusten System zur Organisation des Schulalltags und einer sicheren, benutzerfreundlichen Plattform.",
    "changes": [
        "Wir stellen die Infos so bald wie möglich bereit."
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