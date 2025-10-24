<template>
  <div class="mobile-card-list-wrapper">
    <div style="display: flex; justify-content: center; align-items: center;">
      <h2>Mehr erfahren</h2>
    </div>
    <NCollapse :default-expanded-names="['']" class="mobile-collapse-list">

      <NCollapseItem name="homework" class="mobile-list-item">
        <template #header>
          <div class="mobile-list-header">
            <NIcon :size="20" color="var(--primary)"><ClipboardList color="white" /></NIcon>
            <span class="mobile-list-title">Hausaufgabe morgen</span>
          </div>
        </template>
        <template #header-extra>
          <NCheckbox :checked="true"  size="small" :theme-overrides="{ colorChecked: '#70e0ff' }" />
        </template>
        <NCard size="small" :bordered="false" class="mobile-card-content">
          <p class="small-detail">CDA p. 77/78</p>
          <NButton  @click="handleButtonClick('französischHa')" size="small" type="info" secondary>
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
          <NButton   @click="handleButtonClick('deutschKa')" size="small" type="info" secondary>
            <div >Lernzettel öffnen</div>
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
          <NButton   @click="handleButtonClick('vocabHw')" size="small" type="success" secondary>
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
          <NButton  @click="handleButtonClick('ausfall')" size="small" type="error" secondary>
            Auf DSB überprüfen
          </NButton>
        </NCard>
      </NCollapseItem>

    </NCollapse>

  </div>
</template>

<script setup lang="ts">
import {
  NButton, NCard, NCollapse, NCollapseItem, NTag, NCheckbox, NIcon,
  useMessage
} from 'naive-ui';
import {ClipboardList, BookOpen, Clock, AlertTriangle, HelpingHand, AnnoyedIcon, LockKeyhole, SmilePlus, Laugh} from 'lucide-vue-next';
import { h } from 'vue';

const message = useMessage()

const renderIcon = (iconComponent: any) => {

  return () => h(NIcon, null, { default: () => h(iconComponent) });
}


const handleButtonClick = (aktionstyp: string) => {

  let contentText: string;
  let messageType: 'info' | 'warning' | 'error' | 'success';
  let iconComponent: any;

  if (aktionstyp === 'französischHa') {
    contentText = 'Tja, dabei können wir dir auch nicht helfen.';
    messageType = 'info';
    iconComponent = AnnoyedIcon;
  }
  else if (aktionstyp === 'deutschKa') {
    contentText = 'Passwort eingeben --> Losstarten';
    messageType = 'info';
    iconComponent = LockKeyhole;
  }
  else if (aktionstyp === 'vocabHw') {
    contentText = 'Eigentlich Seite 178-384, aber das ersparen wir euch.';
    messageType = 'info';
    iconComponent = SmilePlus;
  }
  else if (aktionstyp === 'ausfall') {
    contentText = 'Spaß, natürlich fällt die 1./2. Stunde nicht aus.';
    messageType = 'info';
    iconComponent = Laugh;
  }
  else {
    contentText = `Unbekannter Parameter '${aktionstyp}'. `;
    messageType = 'info';
    iconComponent = null;
  }

  message[messageType](contentText, {
    duration: 1800,
    icon: iconComponent ? renderIcon(iconComponent) : undefined
  });
}


</script>

<style scoped>

.mobile-card-list-wrapper {
  padding: 0 20px 40px;
}
.mobile-collapse-list {
  margin-top: 30px;
}

.mobile-list-item {
  margin-bottom: 12px;
  background-color: rgba(100, 100, 100, 0.25); /* Dunkel, leicht transparent */
  backdrop-filter: blur(10px); /* Der gewünschte Blur-Effekt */
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

/* Interaktiver Effekt */
.mobile-list-item:hover {
  transform: translateY(-2px); /* Leichter Schwebe-Effekt */
}

/* Header des Collapse-Items (dort wo der Klick passiert) */
:deep(.n-collapse-item__header) {
  padding: 16px 20px !important;
  color: var(--n-text-color-base);
  font-weight: 600;
  border-bottom: none !important; /* Wichtig, um die Standard-Border von NCollapse zu entfernen */
}
:deep(.n-collapse-item-arrow) {
  color: white !important;
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
</style>