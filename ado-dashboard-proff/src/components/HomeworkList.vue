<template>
  <section class="feature-section-compact">
    <div style="cursor: pointer" @click="closeHomeworkEmit" class="close-icon-container">
      <X class="closeIcon"/>
    </div>

    <div class="text-center header-content">
      <h2 class="feature-title-compact">Alle Hausaufgaben auf einen Blick</h2>
      <p class="feature-subtitle-compact">
        Nie wieder eine Abgabe verpassen. Weniger Stress, bessere Planung.
      </p>
    </div>

    <div class="feature-list-compact">
      <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-item-compact"
      >
        <div class="icon-title-group">
          <div class="icon-square">
            <component :is="feature.icon" class="feature-icon-compact" />
          </div>
          <h3 class="feature-name-compact">{{ feature.title }}</h3>
        </div>

        <p class="feature-description-compact">
          {{ feature.description }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { Calendar, CheckCircle, Bell, X } from 'lucide-vue-next'

interface Feature {
  title: string
  description: string
  icon: any
}

// Emit-Funktion angepasst
const emit = defineEmits(['closeHomework']);

function closeHomeworkEmit() {
  emit('closehw');
}

// Features inhaltlich angepasst
const features = ref<Feature[]>([
  {
    title: 'Hausaufgaben organisieren',
    description: 'Habe alle Hausaufgaben von überall aus im BLick.',
    icon: Calendar // Neu: Kalender für Fälligkeiten
  },
  {
    title: 'Aufgaben abhaken',
    description: 'Markiere erledigte Aufgaben schnell als "Fertig" und behalte nur das Wichtige im Fokus.',
    icon: CheckCircle // Neu: Haken für Erledigung
  },
  {
    title: 'Hilf anderen',
    description: 'Hilf anderen und lass dir von anderen Helfen.',
    icon: Bell // Neu: Glocke für Benachrichtigungen
  }
])
</script>

<style scoped>
.feature-section-compact {
  z-index: 10;
  background: #333333; /* Dunkles, professionelles Grau */
  padding: 1rem 1rem;
  max-width: 500px; /* Max. Breite reduziert */
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Header-Styles angepasst */
.header-content {
  padding-bottom: 1rem;
}
.feature-title-compact {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
  color: white;
}
.feature-subtitle-compact {
  font-size: 0.95rem;
  color: #a0a0a0;
  margin-bottom: 0;
}

/* Feature Liste (Statt Grid) */
.feature-list-compact {
  display: flex;
  flex-direction: column;
  gap: 10px; /* Kleinerer Abstand zwischen den Elementen */
}

/* Einzelnes Feature Element (Minimalistisches List-Item) */
.feature-item-compact {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.8rem 1rem;
  border-radius: 8px;
  transition: background 0.2s ease;
  cursor: default;
}
/* Subtiler, professioneller Hover-Effekt */
.feature-item-compact:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Icon & Titel gruppiert */
.icon-title-group {
  display: flex;
  align-items: center;
  margin-bottom: 0.4rem;
}

/* Quadratisches Icon-Feld */
.icon-square {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

/* Icon selbst mit blauem Akzent */
.feature-icon-compact {
  width: 20px;
  height: 20px;
  color: #4a90e2; /* Blauer Akzent für Professionalität */
}

/* Titel */
.feature-name-compact {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

/* Beschreibung kompakter und direkt sichtbar */
.feature-description-compact {
  font-size: 0.85rem;
  color: #b0b0b0;
  line-height: 1.4;
  margin-left: 40px; /* Eingerückt unter dem Icon */
  margin-top: 0;
}

/* Close Icon Styling */
.close-icon-container {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
}

.closeIcon{
  background-color: rgba(0, 0, 0, 0.0);
  border-radius: 5px;
  height: 25px;
  width: 25px;
  transition: 0.1s ease-in;
}
.closeIcon:hover{
  background-color: rgba(255, 255, 255, 0.1);
}

/* Media Queries beibehalten */
@media (max-width: 600px) {
  .feature-section-compact {
    padding: 1rem 0.8rem;
  }
  .feature-item-compact {
    padding: 0.6rem 0.8rem;
  }
  .feature-title-compact {
    font-size: 1.4rem;
  }
  .feature-name-compact {
    font-size: 0.95rem;
  }
  .feature-description-compact {
    font-size: 0.8rem;
    margin-left: 35px;
  }
}
</style>