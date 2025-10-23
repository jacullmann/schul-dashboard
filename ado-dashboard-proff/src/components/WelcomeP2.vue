<template>
  <section class="pro-analytics-cta-section" :style="{ backgroundColor: 'var(--n-card-color)', padding: '100px 40px' }">
    <div class="pro-analytics-cta-inner">

      <n-grid x-gap="40" :cols="isMobile ? 1 : 3" :style="{ marginBottom: '60px' }">

        <n-gi>
          <n-statistic label="Ø Zufriedenheit" tabular-nums>
            <template #value>99<span style="font-size: 1.5rem;">%</span></template>
            <template #suffix>
              <n-icon :component="HeartHandshake" color="#f0a000" size="28" />
            </template>
            <template #description>
              <n-tag type="warning" size="small">Aus 4.500 Bewertungen</n-tag>
            </template>
          </n-statistic>
        </n-gi>

        <n-gi>
          <n-statistic label="Wöchentliche Zeitersparnis">
            <template #value>6.8<span style="font-size: 1.5rem;">h</span></template>
            <template #suffix>
              <n-icon :component="Gauge" color="#18a058" size="28" />
            </template>
            <template #description>
              Fokus auf das Wesentliche
            </template>
          </n-statistic>
        </n-gi>

        <n-gi>
          <n-statistic label="Aktive Schulen">
            <template #value>500<span style="font-size: 1.5rem;">+</span></template>
            <template #suffix>
              <n-icon :component="School" color="#2080f0" size="28" />
            </template>
            <template #description>
              Kontinuierlich wachsend
            </template>
          </n-statistic>
        </n-gi>
      </n-grid>

      <n-divider />

      <div class="cta-block-wrapper">
        <n-grid x-gap="40" :cols="isMobile ? 1 : 2" :item-responsive="true" class="cta-grid">

          <n-gi class="cta-text-content">
            <n-h2 class="cta-heading">
              Bereit für den **Quantensprung** in deinem Schulalltag?
            </n-h2>
            <n-p depth="2" class="cta-subtext">
              Überlasse die Organisation der KI und fokussiere dich auf deine Noten. Das Dashboard Pro ist der Schlüssel zu deiner akademischen Exzellenz.
            </n-p>
          </n-gi>

          <n-gi class="cta-button-content" :style="{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: isMobile ? '30px' : '0' }">
            <n-button
                type="primary"
                size="large"
                strong
                round
                @click="handleCtaClick"
                :style="{ minWidth: '250px' }"
            >
              <template #icon><n-icon :component="Rocket" /></template>
              Jetzt Probiere starten
            </n-button>
          </n-gi>

        </n-grid>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  NLayout, NGrid, NGi, NStatistic, NIcon, NTag, NDivider, NButton, NH2, NP
} from 'naive-ui';
// Lucide Icons
import { HeartHandshake, Gauge, School, Rocket } from 'lucide-vue-next';

// --- RESPONSIVE LOGIC ---
const isMobile = ref(false);
const checkMobile = () => {
  // Passend zum Breakpoint in Ihrer AuthPage
  isMobile.value = window.innerWidth < 1024;
};
onMounted(() => {
  window.addEventListener('resize', checkMobile);
  checkMobile();
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile);
});
// -------------------------

/**
 * Simuliert die Klick-Aktion (kann später auf showAuth = true umgeleitet werden)
 */
const handleCtaClick = () => {
  console.log('CTA geklickt: Zur Registrierung weiterleiten');
  // Wenn diese Komponente in der AuthPage eingebunden ist, könnten Sie ein Event emittieren:
  // emit('startAuth');
};
</script>

<style scoped>
.pro-analytics-cta-section {
  /* Passt den Hintergrund dynamisch an das Naive UI Theme an */
  border-top: 1px solid var(--n-border-color);
}

.pro-analytics-cta-inner {
  max-width: 1400px;
  margin: 0 auto;
}

/* Statistische Sektion */
.n-statistic {
  text-align: center;
}

/* Anpassungen für mobile Statistik */
@media (max-width: 1024px) {
  .n-statistic {
    text-align: left; /* Auf Mobile linksbündig */
    margin-bottom: 25px;
  }
}

/* CTA Block Styling */
.cta-block-wrapper {
  padding: 40px 0;
}

.cta-heading {
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 10px;
}

.cta-subtext {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--n-text-color-2);
}

.cta-button-content {
  /* Stellt sicher, dass der Button auf Desktop rechts ausgerichtet ist */
  text-align: right;
}
</style>