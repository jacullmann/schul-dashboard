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
    version: 'v1.0',
    date: 'Voraussichtlich: 15. Dezember 2025 ',
    title: 'Erste Vollständige Version vom Schul-Dashboard.',
    description: 'Mit dieser Version ist die Seite voll funktionsfähig und benutzbar.',
    changes: [
      'Vollständiges Dashboard,',
    ],
  },
  {
    version: 'v0.5',
    date: '11. Dezember 2025',
    title: 'Testphase der Seite',
    description: 'Diese Version ist der Grundbaustein für alle nachfolgenden Versionen. Es handelt sich um die Vorbereitung für den Release am 15. Dezember 2025.',
    changes: [
      'Grundlegende Funktionalität implentiert und Grundbausteine gelegt.',
      'Vorbereitung auf den Release.',
    ],
  },
];

// --- State ---
const searchQuery = ref('');
const selectedVersion = ref<string>(updates[0].version);

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
};
</script>

<template>
  <div class="update-history-container">

    <aside class="sidebar">
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

    <main class="content-area">
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
  min-height: 100vh;
}

/* --- Sidebar --- */
.sidebar {
  width: 300px;
  background-color: #0F0F0F;
  border-right: 1px solid var(--border2);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
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
  color: #AAA;
}

.search-input {
  width: 100%;
  background-color: #282828;
  border: 1px solid #414141;
  color: #F1F1F1;
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
  background-color: #282828;
  border-radius: 3px;
}

.version-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #282828;
  color:#f1f1f1;
}

.version-item:hover {
  background-color: #282828;
}

.version-item.active {
  background-color: #f1f1f1;
  color:#0f0f0f;
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
  color: #AAA;
  font-size: 0.9rem;
}

/* --- Right Content Area --- */
.content-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  max-width:1100px;
}

.content-card {
  border-radius: 16px;
  padding: 16px;
  border: 1px solid var(--border2);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.main-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #F1F1F1;
}

.sub-title {
  margin: 4px 0 0 0;
  font-size: 1.1rem;
  font-weight: 400;
  color: #AAA;
}

.header-date {
  font-size: 0.9rem;
  color: #F1F1F1;
  background-color: #414141;
  padding: 4px 8px;
  border-radius: 6px;
}

.divider {
  height: 1px;
  background-color: #414141;
  margin: 16px 0;
}

.description {
  line-height: 1.6;
  color: #F1F1F1;
  margin-bottom: 24px;
}

.changes-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #AAA;
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
  color: #F1F1F1;
}

.changes-list li::before {
  content: "•";
  color: #AAA;
  font-weight: bold;
  position: absolute;
  left: 0;
}
</style>