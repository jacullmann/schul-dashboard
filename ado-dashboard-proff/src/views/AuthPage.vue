<template>
  <!-- Die äußere Klasse "card" sorgt für die Einhaltung Ihres Layouts -->
  <div class="card welcome-page">
    <!-- Section 1: Hero - Groß, Auffällig und Animiert -->
    <section class="hero-section">
      <!-- Hintergrund-Asset für professionelle Tiefe (simulierte fließende Grid) -->


      <h1 class="hero-title">
        <span class="text-gradient">Dashboard</span>
        <span class="subtitle-line">Habe Hausaufgaben, Prüfungen und vieles mehr immer im Blick.</span>
      </h1>
      <p class="hero-description">Ein klarer, fokussierter Arbeitsbereich für Schüler — organisiert, synchronisiert und designbewusst.</p>
      <div class="hero-actions">
        <button @click="scrollToAuth" class="btn primary-btn">
        Zum Dashboard &rarr;
      </button>
        <button @click="scrollToAuth" class="btn ghost-btn">
          Features Entdecken
        </button>
      </div>
    </section>






    <section class="cta-section">
      <h2 class="section-title cta-heading">Bereit für das nächste Level?</h2>
      <p>Tritt der Community bei, um mehr Features zu erlangen.</p>
      <button @click="scrollToAuth" class="btn primary-btn large-btn pulse-effect">
        Kostenlos Registrieren
      </button>
    </section>
  </div>

  <Auth ref="authComponentRef"/>


</template>

<script setup lang="ts">
import { ref } from 'vue';
import Auth from './Welcome.vue';

const authComponentRef = ref<InstanceType<typeof Auth> | null>(null);

const scrollToAuth = () => {
  // Zugriff auf das native DOM-Element der Komponente
  const el = authComponentRef.value?.$el;

  if (el instanceof HTMLElement) { // Prüfen, ob es sich um ein DOM-Element handelt
    el.scrollIntoView({
      behavior: 'smooth', // Sanftes Scrollen aktivieren
      block: 'start'      // Das Element oben in den Viewport scrollen
    });
  }
};
</script>

<style scoped>
.btn{
  font-size: 1.05rem;
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.primary-btn {
  background: linear-gradient(90deg, var(--primary), #a020f0);
  color: white;
  border: none;
  box-shadow: 0 8px 20px rgba(160,32,240,0.12);
}
.ghost-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text);
}

/* Scoped Styles für die Welcome Page */
.welcome-page {
  padding: 20px 14px;
  min-height: 80vh;
  background: var(--card);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.55);
  border-radius: 12px;
}

/* --- Hero Section --- */
.hero-section {
  text-align: center;
  padding: 30px 10px;
  overflow: visible;
  position: relative;
  z-index: 10;
}

.hero-title {
  font-size: 3.2rem;
  font-weight: 800;
  line-height: 1.05;
  margin-bottom: 10px;
  color: var(--text);
  animation: slideInUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.text-gradient {
  display: block;
  font-size: 1.15em;
  background: linear-gradient(90deg, #FF7A00,  #3A0CA3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle-line {
  display: block;
  font-size: 0.35em;
  font-weight: 400;
  color: var(--muted);
  margin-top: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-description {
  font-size: 1.05rem;
  color: var(--sub);
  max-width: 720px;
  margin: 14px auto 28px;
  animation: fadeIn 1s ease-out 0.2s forwards;
  opacity: 0;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
  animation: slideInUp 0.8s ease-out 0.4s forwards;
  opacity: 0;
}



/* --- Section Divider --- */
.section-divider {
  border-top: 1px dashed var(--jj);
  margin: 48px 0;
  width: 70%;
  margin-left: auto;
  margin-right: auto;
  opacity: 0.45;
}



.philosophy-text h2 {
  margin-top: 0;
}

.philosophy-text p {
  color: var(--sub);
  line-height: 1.6;
}

.philosophy-text ul {
  margin-top: 12px;
  padding-left: 0;
  list-style: none;
}

.philosophy-text li {
  margin-bottom: 8px;
  color: var(--muted);
  padding-left: 8px;
  border-left: 3px solid rgba(255,255,255,0.03);
}



.testimonial-card blockquote {
  margin: 0 0 10px 0;
  color: var(--text);
}

/* --- Final CTA Section --- */
.cta-section {
  text-align: center;
  padding: 36px 0 60px 0;
}

.cta-heading {
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(45deg, var(--primary), #a020f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.large-btn {
  padding: 14px 30px;
  font-size: 1.05rem;
  font-weight: 700;
  border-radius: 10px;
}

/* Pulse effect */
.pulse-effect {
  position: relative;
  z-index: 1;
  transition: transform 0.18s ease;
}
.pulse-effect:hover {
  transform: translateY(-3px);
}
.pulse-effect::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 12px;
  z-index: -1;
  background: linear-gradient(90deg, rgba(255,122,0,0.08), rgba(160,32,240,0.08));
  opacity: 1;
  filter: blur(12px);
  transition: opacity 0.3s ease;
}
.pulse-effect:hover::before {
  opacity: 0.9;
}

/* --- Keyframe Animations --- */
@keyframes slideInUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes rotateAndZoom {
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(1.0); }
  50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.03); }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.0); }
}

/* --- Responsiveness (Mobile First) --- */
@media (max-width: 1100px) {

  .hero-title { font-size: 2.8rem; }
  .hero-actions {
    flex-direction: row;
    flex: 2;
  }
}

@media (max-width: 820px) {

}

@media (max-width: 520px) {
  .hero-title { font-size: 2.2rem; }
  .hero-description { font-size: 0.98rem; max-width: 92%; }
  .hero-actions { flex-direction: column; gap: 10px; }
  .btn { width: 100%; max-width: none; }
}

/* Desktop enhancements */
@media (min-width: 1200px) {
  .hero-title { font-size: 3.8rem; }
  .welcome-page { padding: 48px; }
}
</style>

