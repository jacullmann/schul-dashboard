<script setup lang="ts">
import { ref } from 'vue';
import { Lock, EyeOff, ShieldCheck } from 'lucide-vue-next';

const hoveredCardIndex = ref(-1);
const expanded = ref<boolean>(false);

function expand() {
  expanded.value = !expanded.value;
}

const features = [
  {
    icon: Lock,
    title: 'Verschlüsselt',
    text: 'Deine privaten Einträge werden mit der extrem sicheren Technologie (AES-256 GCM) verschlüsselt. Dies ist der gleiche Sicherheitsstandard, den Banken, Regierungen und das Militär verwenden.',
    fullText: 'Deine privaten Einträge werden mit einer extrem sicheren Technologie (AES-256 GCM) verschlüsselt. Dies ist der gleiche Sicherheitsstandard, den Banken, Regierungen und das Militär verwenden. Durch die Verwendung dieser Verschlüsselung stellen wir sicher, dass deine Daten selbst bei kompromittierter Datenbank sicher und nicht entschlüsselbar sind.'
  },
  {
    icon: EyeOff,
    title: 'Privatsphäre',
    text: 'Nur du kannst deine privaten Einträge einsehen. Sie sind vollkommen privat und nur für dich zugänglich – selbst wir haben keinen Zugriff darauf.',
    fullText: 'Nur du kannst deine privaten Einträge einsehen. Sie sind vollkommen privat und nur für dich zugänglich – selbst wir haben keinen Zugriff darauf. Wir speichern niemals Passwörter und private Einträge im Klartext und nutzen in Deutschland liegende Server.'
  },
  {
    icon: ShieldCheck,
    title: 'Versprechen',
    text: 'Es hat für uns die höchste Priorität, deine Daten zu schützen. Deine Einträge werden sicher und verschlüsselt gespeichert.',
    fullText: 'Es hat für uns die höchste Priorität, deine Daten zu schützen. Deine Einträge werden sicher und verschlüsselt gespeichert. Wir entwickeln unsere eigene Sicherheitsarchitektur stetig weiter.'
  }
];

const isHovered = (index: number) => hoveredCardIndex.value === index;

const getCardWidth = (index: number) => {
  if (hoveredCardIndex.value === -1) {
    return 'calc(33.33% - 1rem)';
  } else if (isHovered(index)) {
    return '60.00%';
  } else {
    return '20.00%';
  }
};
</script>

<template>
  <div class="security-info-container">
    <div style="margin-bottom: 10px">
    <div v-if="!expanded">
      <button @click="expand" class="btn ghost">Erfahre mehr</button>

    </div>
    <div v-if="expanded">
      <button @click="expand" class="btn ghost">Schließen</button>

    </div>
    </div>
    <div v-if="expanded">
    <h3><ShieldCheck :size="20" class="title-icon" /> Sicherheit auf höchstem Niveau</h3>
    <hr />

    <div class="features-grid-flex">
      <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-card"
          :class="{ 'is-hovered': isHovered(index), 'is-dimmed': hoveredCardIndex !== -1 && !isHovered(index) }"
          :style="{ flexBasis: getCardWidth(index) }"
          @mouseenter="hoveredCardIndex = index"
          @mouseleave="hoveredCardIndex = -1"
      >
        <div class="noicon">
          <component :is="feature.icon" :size="22" class="icon" />
          <h4>{{ feature.title }}</h4>
        </div>

        <p class="card-text">
          {{ isHovered(index) ? feature.fullText : feature.text }}
        </p>

        <div class="hover-overlay" v-if="isHovered(index)">
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.security-info-container {
  background:transparent;
  border-radius: 12px;
  padding: 2rem;
  margin-top: 2.5rem;
  border: none;
  min-height: 700px;
  display: flex;
  justify-content: center;
}

.security-info-container h3 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  color: var(--text);
  margin: 0 0 0.5rem 0;
}

.features-grid-flex {
  display: flex;
  gap: 1.5rem;
  transition: all 0.5s ease-in-out;
  max-width: 98%;
}

.feature-card {
  background: rgba(150, 150, 150, 0.1);
  padding: 1.5rem;
  border-radius: 10px;
  border: none;
  transition:
      flex-basis 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
      opacity 0.5s ease,
      background 0.3s ease,
      box-shadow 0.3s ease;

  overflow: hidden;
  flex-grow: 1;
  flex-shrink: 0;
  height: 350px;
}

.feature-card.is-hovered {
}

.feature-card.is-dimmed {
  opacity: 1;
}

.icon {
  stroke-width: 2;
}

.feature-card h4 {
  font-size: 1.1rem;
  color: var(--text);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  transition: all 0.5s ease;
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}
.card-text {
  transition: opacity 0.5s ease-in-out;
}


.noicon {
  display: flex;
  gap: 0.55rem;
}



@media (max-width: 768px) {
  .features-grid-flex {
    flex-direction: column;
  }
  .title-icon {
    display: none;
  }
  .feature-card {
    flex-basis: auto !important;
    width: 100%;
    opacity: 1 !important;
  }
  .security-info-container {

  }
}
</style>