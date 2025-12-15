<template>
  <!-- src/views/legal/LegalLayout.vue -->
  <div class="card">
    <div class="row" style="margin-bottom:16px;">
      <TabSwitcher
          :items="tabs"
          :active-id="activeTabId"
          @change="handleTabChange"
      />
    </div>

    <!-- Die router-view bleibt unverändert, um den Inhalt anzuzeigen -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TabSwitcher from '../../components/TabSwitcher.vue';

// Schnittstelle für die Tabs, die der TabSwitcher erwartet
interface NavItem {
  id: string;      // Muss dem Routennamen oder dem Pfad-Segment entsprechen
  label: string;   // Der im UI angezeigte Text
  routePath: string; // Der tatsächliche Pfad, zu dem navigiert werden soll
}

const route = useRoute();
const router = useRouter();

// 1. Definition der Tabs
const tabs: NavItem[] = [
  { id: 'impressum', label: 'Impressum', routePath: 'impressum' },
  { id: 'datenschutz', label: 'Datenschutz', routePath: 'datenschutz' },
  { id: 'nutzung', label: 'Nutzungsbedingungen', routePath: 'nutzung' },
];

// 2. Bestimmen der aktiven ID basierend auf der aktuellen Route
const activeTabId = computed(() => {
  // Wir prüfen, ob die aktuelle Route mit einem der definierten Tab-Pfade endet
  // Dies stellt sicher, dass der korrekte Tab als aktiv markiert wird
  if (route.path.endsWith('/impressum')) {
    return 'impressum';
  }
  if (route.path.endsWith('/datenschutz')) {
    return 'datenschutzerklaerung';
  }
  if (route.path.endsWith('/nutzung')) {
    return 'nutzung';
  }

  if (route.path.endsWith('/legal/')) {
    return 'impressum';
  }
  return '';
});

// 3. Behandlung des 'change' Events vom TabSwitcher
const handleTabChange = (newId: string) => {
  const selectedTab = tabs.find(tab => tab.id === newId);

  if (selectedTab) {
    // Navigiere zur entsprechenden Route, wenn ein Tab geklickt wird
    // Die Navigation erfolgt relativ zum aktuellen Pfad oder direkt zum definierten routePath
    router.push(selectedTab.routePath);
  }
};

onMounted(() => {
  handleTabChange(route.path);
})
</script>

<style scoped>
/*
  Beachten Sie: Der TabSwitcher bringt sein eigenes Styling mit.
  Zusätzliches Styling ist hier normalerweise nicht nötig,
  außer für das Layout der .card oder .row.
*/
</style>