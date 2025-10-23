<template>
  <div class="mobile-card-list-wrapper">
    <NCollapse :default-expanded-names="['']" class="mobile-collapse-list">

      <NCollapseItem name="homework" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" :color="homeworkTask.done ? 'var(--n-color-success)' : 'var(--primary)'">
              <ClipboardList :color="homeworkTask.done ? 'var(--n-color-success)' : 'white'" />
            </NIcon>
            <span class="mobile-list-title" :style="{ opacity: homeworkTask.done ? 0.6 : 1 }">
              {{ homeworkTask.title }}
            </span>
          </div>
        </template>
        <template #header-extra>
          <NCheckbox
              :checked="homeworkTask.done"
              @update:checked="toggleTask('homework')"
              size="small"
              :theme-overrides="{ colorChecked: '#70e0ff' }"
          />
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">{{ homeworkTask.details }}</p>
          <NButton size="small" type="info" secondary>
            Details anzeigen
          </NButton>
        </NCard>
      </NCollapseItem>

      <NCollapseItem name="test" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--n-color-warning)"><BookOpen /></NIcon>
            <span class="mobile-list-title">Klassenarbeit Deutsch</span>
          </div>
        </template>
        <template #header-extra>
          <NTag type="warning" size="small" round>Wichtig</NTag>
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail theme">Thema: Gedichtsanalyse und Inhaltszusammenfassung</p>
          <NButton size="small" type="info" secondary>
            <div>Lernzettel öffnen</div>
          </NButton>
        </NCard>
      </NCollapseItem>

      <NCollapseItem name="tasks" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--n-color-success)"><Clock /></NIcon>
            <span class="mobile-list-title">Vokabelkarten anfertigen bis Freitag</span>
          </div>
        </template>
        <template #header-extra>
          <div class="progress-extra">
            <NProgress
                type="line"
                :percentage="vokabelTask.progress"
                :show-indicator="true"
                :color="vokabelTask.progress === 100 ? 'var(--n-color-success)' : '#70e0ff'"
                :rail-color="vokabelTask.progress === 100 ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)'"
                :height="6"
                :style="{ width: '50px' }"
            />
          </div>
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">Seite 177-178 komplett als Vokabelkarten aufschreiben</p>
          <NButton @click="vokabelTask.progress = Math.min(100, vokabelTask.progress + 10)" size="small" type="success" secondary>
            Fortschritt (+10%)
          </NButton>
        </NCard>
      </NCollapseItem>

      <NCollapseItem name="schedule" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--n-color-error)"><AlertTriangle /></NIcon>
            <span class="mobile-list-title">Stundenplan-Änderung!</span>
          </div>
        </template>
        <template #header-extra>
          <NTag type="error" size="small" round>Ausfall</NTag>
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail" style="font-weight: bold; color: var(--n-color-error)">1./2. entfällt heute!</p>
          <NButton size="small" type="error" secondary>
            Auf DSB überprüfen
          </NButton>
        </NCard>
      </NCollapseItem>

    </NCollapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NCard, NCollapse, NCollapseItem, NTag, NCheckbox, NIcon, NProgress } from 'naive-ui';
import { ClipboardList, BookOpen, Clock, AlertTriangle } from 'lucide-vue-next';

// ------------------------------------
// 1. TypeScript für Task-Daten
// ------------------------------------

// Schnittstelle für einfache Aufgaben (Hausaufgabe)
interface SimpleTask {
  id: 'homework';
  title: string;
  details: string;
  done: boolean;
}

// Schnittstelle für Aufgaben mit Fortschritt (Vokabelkarten)
interface ProgressTask {
  id: 'vokabel';
  title: string;
  details: string;
  progress: number; // 0 bis 100
}

// ------------------------------------
// 2. Reaktiver Zustand
// ------------------------------------

const homeworkTask = ref<SimpleTask>({
  id: 'homework',
  title: 'Hausaufgabe morgen',
  details: 'CDA p. 77/78',
  done: true
});

const vokabelTask = ref<ProgressTask>({
  id: 'vokabel',
  title: 'Vokabelkarten anfertigen bis Freitag',
  details: 'Seite 177-178 komplett als Vokabelkarten aufschreiben',
  progress: 30 // Startet bei 30%
});

// ------------------------------------
// 3. Interaktive Funktionen
// ------------------------------------

function toggleTask(id: 'homework') {
  if (id === 'homework') {
    homeworkTask.value.done = !homeworkTask.value.done;
  }
  // Weitere Toggle-Logik könnte hier hinzugefügt werden
}

// ------------------------------------
// (Props und Emits können hier bleiben, ich habe sie der Übersicht halber entfernt,
// aber in Ihrer finalen Datei müssen sie wieder rein, falls benötigt.)
// ------------------------------------
</script>

<style scoped>
/* Ihre bestehenden, überarbeiteten Styles */
.mobile-card-list-wrapper {
  padding: 0 20px 40px;
}
.mobile-collapse-list {
  margin-top: 30px;
}

.mobile-list-item {
  margin-bottom: 12px;
  background-color: rgba(100, 100, 100, 0.25);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.mobile-list-item:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
  transform: translateY(-2px);
}

:deep(.n-collapse-item__header) {
  padding: 16px 20px !important;
  color: var(--n-text-color-base);
  font-weight: 600;
  border-bottom: none !important;
}

:deep(.n-collapse-item-arrow) {
  color: white !important;
}

:deep(.n-collapse-item) {
  border-top: none !important;
}

.mobile-list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.mobile-list-title {
  font-weight: 600;
  font-size: 1.1rem;
  transition: opacity 0.3s; /* Für den 'Erledigt'-Effekt */
}

.mobile-card-content {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 12px 20px 16px 20px !important;
  border-radius: 0 0 12px 12px;
  color: white;
}

.mobile-card-content p {
  margin: 0 0 10px 0;
}

.small-detail {
  font-size: 14px;
  color: var(--n-text-color-base);
}

.theme {
  color: var(--n-color-warning);
}

/* NEU: Styling für den Fortschrittsbalken im Header */
.progress-extra {
  width: 60px; /* Platz für den Fortschrittsbalken */
  display: flex;
  align-items: center;
}
</style>