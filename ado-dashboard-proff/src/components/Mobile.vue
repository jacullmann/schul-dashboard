<template>
  <div class="mobile-card-list-wrapper">
    <NCollapse :default-expanded-names="['homework']" class="mobile-collapse-list">

      <NCollapseItem name="homework" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--primary)"><ClipboardList /></NIcon>
            <span class="mobile-list-title">Hausaufgabe morgen</span>
          </div>
        </template>
        <template #header-extra>
          <NCheckbox :checked="true" size="small" :theme-overrides="{ colorChecked: '#70e0ff' }" />
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">CDA p. 77/78</p>
          <NButton @click="$emit('openHwCheck')" size="small" type="info" secondary>
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
          <NButton @click="$emit('toggleLearningList')" size="small" type="info" secondary>
            <div v-if="!batProp">Lernzettel öffnen</div>
            <span v-else>Lernzettel schließen</span>
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
          <NCheckbox :checked="false" size="small" />
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">Seite 177-178 komplett als Vokabelkarten aufschreiben</p>
          <NButton @click="$emit('openVocabCheck')" size="small" type="success" secondary>
            Vokabelliste anschauen
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
          <NButton @click="$emit('triggerNotification')" size="small" type="error" secondary>
            Auf DSB überprüfen
          </NButton>
        </NCard>
      </NCollapseItem>

    </NCollapse>
  </div>
</template>

<script setup lang="ts">
import { NButton, NCard, NCollapse, NCollapseItem, NTag, NCheckbox, NIcon } from 'naive-ui';
import { ClipboardList, BookOpen, Clock, AlertTriangle } from 'lucide-vue-next';

// Definiere Props und Emits
defineProps<{
  batProp: boolean; // Zustand für LearningList
}>();

defineEmits([
  'openHwCheck',
  'openVocabCheck',
  'toggleLearningList',
  'triggerNotification'
]);
</script>

<style scoped>
/* Die Styles wurden überarbeitet, um dem Floating-Card-Stil zu entsprechen */

.mobile-card-list-wrapper {
  padding: 0 20px 40px;
}
.mobile-collapse-list {
  margin-top: 30px;
}

/* WICHTIG: Naive UI Collapse Item Header anpassen, um den Floating Look zu erhalten */
.mobile-list-item {
  margin-bottom: 12px;

  /* Übernahme des Floating Card Stils von AuthPage.vue */
  background-color: rgba(26, 26, 26, 0.85); /* Dunkel, leicht transparent */
  backdrop-filter: blur(10px); /* Der gewünschte Blur-Effekt */
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

/* Interaktiver Effekt */
.mobile-list-item:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
  transform: translateY(-2px); /* Leichter Schwebe-Effekt */
}

/* Header des Collapse-Items (dort wo der Klick passiert) */
:deep(.n-collapse-item__header) {
  padding: 16px 20px !important;
  color: var(--n-text-color-base);
  font-weight: 600;
  border-bottom: none !important; /* Wichtig, um die Standard-Border von NCollapse zu entfernen */
}

/* Naive UI ignoriert 'border: none' auf dem Wrapper, wir müssen die Border auf dem Header-Container entfernen */
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
}

/* Content-Bereich, der aufklappt */
.mobile-card-content {
  /* Innerhalb des blur-Containers: Etwas dunklerer Hintergrund ohne extra Blur */
  background-color: rgba(0, 0, 0, 0.3);
  padding: 12px 20px 16px 20px !important;
  border-radius: 0 0 12px 12px;
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
</style>