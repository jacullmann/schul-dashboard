<template>
  <!-- Die äußere Klasse "card" sorgt für die Einhaltung Ihres Layouts -->
  <div class="card welcome-page">
    <!-- Section 1: Hero - Groß, Auffällig und Animiert -->
    <section class="hero-section">
      <!-- Hintergrund-Asset für professionelle Tiefe (simulierte fließende Grid) -->
      <div class="hero-asset">
        <svg viewBox="0 0 100 100" class="floating-grid" aria-hidden="true">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--jj)" stroke-width="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <h1 class="hero-title">
        <span class="text-gradient">Dashboard</span>
        <span class="subtitle-line">Habe Hausaufgaben, Prüfungen und vieles mehr immer im Blick.</span>
      </h1>
      <p class="hero-description">

      </p>
      <div class="hero-actions">
        <router-link to="/" class="btn">
          Zum Dashboard &rarr;
        </router-link>
        <router-link to="/bewerten" class="btn ghost-btn">
          Features Entdecken
        </router-link>
      </div>
    </section>




    <!-- Section 4: Final Call to Action - Mit subtilem Puls-Effekt -->
    <hr class="section-divider">
    <section class="cta-section">
      <h2 class="section-title cta-heading">Bereit für den nächsten Level?</h2>
      <p>Treten Sie der Community bei, die Bildung neu definiert. Kostenlos. Leistungsstark.</p>
      <router-link to="/register" class="btn primary-btn large-btn pulse-effect">
        Kostenlos Registrieren
      </router-link>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Definition der Feature-Daten
const features = ref([
  { title: 'Homework API', description: 'Strukturierte Verwaltung von Aufgaben, Deadlines und Notizen. Nie wieder eine Frist verpassen.', color: 'var(--primary)', icon: '📚' },
  { title: 'Scheduler Core', description: 'Prüfungen und Termine im Griff. Intelligente Planung mit Fokus auf Ihre Verfügbarkeit.', color: '#A020F0', icon: '🗓️' },
  { title: 'Toolchain Access', description: 'Direkter Zugriff auf einen Pool von Lernressourcen und akademischen Werkzeugen.', color: '#FF7A00', icon: '🛠️' },
  { title: 'Cross-Platform Sync', description: 'Nahtlose Erfahrung auf allen Geräten. Immer und überall synchronisiert.', color: '#FF2D95', icon: '📱' },
]);

// Diese ref könnte verwendet werden, um Elemente nach dem Laden sanft einzublenden
// (ist bereits über CSS-Keyframes simuliert, aber hier als Struktur vorhanden)
const contentVisible = ref(false);

onMounted(() => {
  // Simuliere einen professionellen, sanften Fade-In Effekt der gesamten Komponente nach dem Mount
  setTimeout(() => {
    contentVisible.value = true;
  }, 100);
});
</script>



<style scoped>

.btn{
  font-size: 1.2em;
}
/*
 * Scoped Styles für die Welcome Page
 * Hier kommen die komplexen und professionellen Designs und Animationen rein.
 */

.welcome-page {
  /* Erhöhte Polsterung für einen großzügigen, professionellen Look */
  padding: 20px 1px 1px;
  min-height: 80vh;
  /* Stellt sicher, dass die Karte vor dem animierten Hintergrund hervorsticht */
  background: var(--card);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
}

/* --- Hero Section --- */
.hero-section {
  text-align: center;
  padding: 15px 0;
  overflow: hidden;
  position: relative;
  z-index: 10; /* Stellen Sie sicher, dass der Inhalt über dem Grid ist */
}

.hero-title {
  font-size: 3.8rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 20px;
  color: var(--text);
  /* Animation: Subtiler Slide-in für den Titel */
  animation: slideInUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.text-gradient {
  display: block;
  font-size: 1.4em;
  /* Professioneller Farbverlauf-Text-Effekt */
  background: linear-gradient(90deg, #FF7A00,  #3A0CA3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle-line {
  display: block;
  font-size: 0.3em; /* Kleiner, untergeordneter Text */
  font-weight: 400;
  color: var(--muted);
  margin-top: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-description {
  font-size: 1.25rem;
  color: var(--sub);
  max-width: 700px;
  margin: 0 auto 40px;
  /* Animation mit Verzögerung */
  animation: fadeIn 1.2s ease-out 0.2s forwards;
  opacity: 0;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  /* Animation mit weiterer Verzögerung */
  animation: slideInUp 0.8s ease-out 0.4s forwards;
  opacity: 0;
}



/* Floating Background Asset (professionelle Tiefe) */
.hero-asset {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  max-width: 900px;
  max-height: 500px;
  transform: translate(-50%, -50%);
  opacity: 0.08;
  pointer-events: none;
  z-index: -1; /* Hinter dem Inhalt */
}

.floating-grid {
  width: 100%;
  height: 100%;
  /* Langsame, unauffällige Rotation und Skalierung */
  animation: rotateAndZoom 60s linear infinite;
}

/* --- General Section Styles --- */
.section-divider {
  border-top: 1px dashed var(--jj);
  margin: 60px 0;
  width: 70%;
  margin-left: auto;
  margin-right: auto;
  opacity: 0.5;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 10px;
  color: var(--text);
}



.philosophy-text p {
  color: var(--sub);
  line-height: 1.7;
}

.philosophy-text ul {
  list-style: none;
  padding: 0;
  margin-top: 20px;
}

.philosophy-text li {
  margin-bottom: 10px;
  color: var(--muted);
  font-weight: 300;
  border-left: 3px solid var(--jj);
  padding: 5px 10px;
  transition: all 0.3s ease;
}

.philosophy-text li:hover {
  border-left-color: #a020f0; /* Sekundäre Akzentfarbe */
  color: var(--text);
  background: rgba(40, 40, 40, 0.3);
}


/* Hervorhebung von Schlüsselwörtern im Code-Snippet-Stil */
.snippet-code pre {
  margin: 0;
}
.snippet-code .key { color: #c9d1d9; }
.snippet-code .val { color: #f59e0b; }


/* --- Final CTA Section --- */
.cta-section {
  text-align: center;
  padding: 40px 0 60px 0;
}

.cta-heading {
  font-size: 2.8rem;
  font-weight: 700;
  margin-bottom: 15px;
  background: linear-gradient(45deg, var(--primary), #a020f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.large-btn {
  padding: 16px 35px;
  font-size: 1.2rem;
  font-weight: 700;
  border-radius: 8px;
}

/* Complex Professional Animation: Pulsing CTA Button */
.pulse-effect {
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.pulse-effect::before {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 10px;
  z-index: -1;
  opacity: 0.3;
}

.pulse-effect:hover::before {
  opacity: 0;
  animation: none;
}


/* --- Keyframe Animations --- */
@keyframes slideInUp {
  0% { transform: translateY(30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.03); opacity: 0.7; }
  100% { transform: scale(1); opacity: 0.4; }
}

@keyframes rotateAndZoom {
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(1.0); }
  50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.05); }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.0); }
}


/* --- Responsiveness (Mobile First) --- */

@media (max-width: 900px) {
  .hero-title {
    font-size: 3rem;
  }
  .features-grid {
    grid-template-columns: 1fr 1fr; /* Zwei Spalten auf Tablets */
  }
  .philosophy-content {
    flex-direction: column;
    gap: 30px;
  }
  .philosophy-text, .code-snippet-card {
    min-width: 100%;
  }
  .philosophy-text {
    order: 2;
  }
  .code-snippet-card {
    order: 1;
  }
  .cta-heading {
    font-size: 2.2rem;
  }
}

@media (max-width: 600px) {
  .welcome-page {
    padding: 30px 10px;
  }
  .hero-title {
    font-size: 2.4rem;
  }
  .hero-description {
    font-size: 1rem;
  }
  .hero-actions {
    flex-direction: row;
    font-size: 12px;
    padding: 1px;
  }
  .btn {
    width: 90%;
    max-width: 300px;
  }
}

@media (min-width: 1200px) {
  .hero-title {
    font-size: 4.5rem;
  }
  .welcome-page {
    padding: 80px 40px;
  }
}
</style>
