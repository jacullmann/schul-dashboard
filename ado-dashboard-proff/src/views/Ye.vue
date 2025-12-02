<template>
  <div class="kanye-archive">

    <div class="hero-section">
      <div class="hero-overlay"></div>
      <div class="hero-content container">
        <span class="hero-badge">THE ARCHIVE</span>
        <h1 class="hero-title">YE</h1>
        <p class="hero-subtitle">
          Visualizing the trajectory of a cultural icon. <br>
          Music. Fashion. Architecture.
        </p>
      </div>
      <div class="hero-bg-art"></div>
    </div>

    <div class="sticky-nav">
      <div class="container nav-row">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            :class="['nav-item', { active: currentTab === tab.id }]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="container content-wrapper">

      <transition name="fade" mode="out-in">
        <section v-if="currentTab === 'music'" key="music" class="tab-section">
          <div class="section-header">
            <h2 class="section-title">Sonic Evolution</h2>
            <p class="section-desc">Eine chronologische Reise durch die Studioalben.</p>
          </div>

          <div class="album-grid">
            <div v-for="album in albums" :key="album.title" class="album-card">
              <div class="album-visual" :style="{ background: album.color }">
                <span class="vinyl-groove"></span>
                <div class="album-overlay">
                  <button class="btn ghost btn-sm">Details</button>
                </div>
              </div>
              <div class="album-info">
                <span class="album-year">{{ album.year }}</span>
                <h3 class="album-title">{{ album.title }}</h3>
                <span class="album-genre">{{ album.genre }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="currentTab === 'vision'" key="vision" class="tab-section">
          <div class="section-header">
            <h2 class="section-title">Aesthetic Language</h2>
            <p class="section-desc">Visuelle Konzepte, Bühnendesign und Mode.</p>
          </div>

          <div class="gallery-masonry">
            <div class="gallery-item large item-1">
              <div class="gallery-content">
                <h3>Yeezy Season</h3>
                <p>Minimalismus und Erdtöne.</p>
              </div>
            </div>
            <div class="gallery-item item-2">
              <div class="gallery-content">
                <h3>Donda Live</h3>
              </div>
            </div>
            <div class="gallery-item item-3">
              <div class="gallery-content">
                <h3>Sunday Service</h3>
              </div>
            </div>
            <div class="gallery-item wide item-4">
              <div class="gallery-content">
                <h3>Architecture</h3>
                <p>Yeezy Home concepts.</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="currentTab === 'philosophy'" key="philosophy" class="tab-section">
          <div class="reading-layout">
            <div class="card text-card">
              <h2 class="card-title-lg">The "Free Thought" Era</h2>
              <hr class="section-divider" />
              <p class="text-body">
                Ye's Philosophie basiert auf der vollständigen Beseitigung von Selbstzweifeln.
                Seine Rhetorik, oft kontrovers, zielt darauf ab, gesellschaftliche Barrieren
                zu durchbrechen, die Kreativität einschränken.
              </p>

              <div class="quote-list">
                <div class="quote-item">
                  <p>"I feel like I'm too busy writing history to read it."</p>
                  <span class="quote-meta">— Interview, 2009</span>
                </div>
                <div class="quote-item">
                  <p>"Believe in your flyness, conquer your shyness."</p>
                  <span class="quote-meta">— Twitter</span>
                </div>
                <div class="quote-item highlight">
                  <p>"Name one genius that ain't crazy."</p>
                  <span class="quote-meta">— Life of Pablo</span>
                </div>
              </div>
            </div>

            <div class="card stat-sidebar">
              <h3 class="card-title-sm">Impact Data</h3>
              <ul class="clean-list">
                <li><span class="label">Grammys:</span> <span class="val">24</span></li>
                <li><span class="label">Spotify Streams:</span> <span class="val">Billions</span></li>
                <li><span class="label">Net Worth Peak:</span> <span class="val">$6.6B</span></li>
              </ul>
            </div>
          </div>
        </section>
      </transition>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// --- STATE MANAGEMENT ---
const currentTab = ref('music');

const tabs = [
  { id: 'music', label: 'Discography' },
  { id: 'vision', label: 'Visuals & Art' },
  { id: 'philosophy', label: 'Philosophy' },
];

// --- REAL DATA (Keine Fake Daten) ---
// Hinweis: 'color' simuliert das Albumcover. Du kannst später ein 'image' feld hinzufügen.
const albums = [
  { title: 'The College Dropout', year: '2004', genre: 'Soul / Hip Hop', color: '#6b3616' },
  { title: 'Late Registration', year: '2005', genre: 'Orchestral Rap', color: '#4a2c22' },
  { title: 'Graduation', year: '2007', genre: 'Stadium Music', color: '#8a2be2' },
  { title: '808s & Heartbreak', year: '2008', genre: 'Electropop', color: '#a0aec0' },
  { title: 'MBDTF', year: '2010', genre: 'Maximalism', color: '#ef4444' },
  { title: 'Yeezus', year: '2013', genre: 'Industrial', color: '#ff335a' }, // Dein Ladebalken-Rot
  { title: 'The Life of Pablo', year: '2016', genre: 'Gospel / Trap', color: '#f97316' },
  { title: 'Ye', year: '2018', genre: 'Psychedelic', color: '#10b981' },
  { title: 'Jesus Is King', year: '2019', genre: 'Gospel', color: '#3b82f6' },
  { title: 'Donda', year: '2021', genre: 'Avant-Garde', color: '#000000' },
  { title: 'Vultures 1', year: '2024', genre: 'Collaborative', color: '#333' },
];

</script>

<style scoped>
/* --- 1. HERO SECTION --- */

.kanye-archive {
  min-height: 100vh;
  padding-bottom: 60px;
}

.hero-section {
  position: relative;
  height: 400px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background-color: #000;
  border-bottom: 1px solid var(--border);
}

.hero-bg-art {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, var(--lp) 0%, transparent 70%);
  opacity: 0.15;
  filter: blur(80px);
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-badge {
  font-size: 0.8rem;
  letter-spacing: 3px;
  color: var(--lp);
  text-transform: uppercase;
  font-weight: bold;
}

.hero-title {
  font-size: 6rem;
  margin: 10px 0;
  color: var(--text-primary);
  letter-spacing: -2px;
  line-height: 1;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--sub);
  max-width: 500px;
  line-height: 1.6;
}

/* --- 2. STICKY NAV (Supabase Style) --- */
.sticky-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15, 15, 15, 0.8); /* var(--lbg) with alpha */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  margin-bottom: 40px;
}

.nav-row {
  display: flex;
  gap: 30px;
  padding-top: 0;
  padding-bottom: 0;
}

.nav-item {
  background: none;
  border: none;
  padding: 20px 0;
  font-family: inherit;
  font-size: 1rem;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
}

.nav-item:hover {
  color: var(--text);
}

.nav-item.active {
  color: var(--text);
  font-weight: 500;
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px; /* Align with border */
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--lp);
  box-shadow: 0 -2px 10px var(--lp);
}

/* --- 3. SECTIONS & LAYOUT --- */
.content-wrapper {
  min-height: 500px;
}

.section-header {
  margin-bottom: 40px;
}

.section-title {
  font-size: 2rem;
  color: var(--text);
  margin: 0 0 10px 0;
}

.section-desc {
  color: var(--sub);
  font-size: 1.1rem;
}

/* --- VIEW: DISCOGRAPHY --- */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.album-card {
  group: hover;
  transition: transform 0.2s ease;
}

.album-card:hover {
  transform: translateY(-5px);
}

.album-visual {
  aspect-ratio: 1/1;
  border-radius: 4px; /* Slight rounded corners */
  margin-bottom: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  border: 1px solid var(--border2);
  /* Vinyl Effect */
  background-image: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%);
}

.album-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.album-visual:hover .album-overlay {
  opacity: 1;
}

.album-year {
  font-size: 0.8rem;
  color: var(--lp);
  font-weight: bold;
  display: block;
}

.album-title {
  font-size: 1rem;
  color: var(--text);
  margin: 4px 0;
  font-weight: 600;
}

.album-genre {
  font-size: 0.85rem;
  color: var(--sub2);
}

/* --- VIEW: GALLERY (Masonry Feel) --- */
.gallery-masonry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 16px;
}

.gallery-item {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s;
}

.gallery-item:hover {
  border-color: var(--lp);
}

/* Platzhalter-Hintergründe für die Galerie */
.item-1 { grid-column: span 2; grid-row: span 2; background: linear-gradient(45deg, #2b2b2b, #1a1a1a); }
.item-2 { grid-column: span 1; background: linear-gradient(to bottom, #3f3f3f, #1a1a1a); }
.item-3 { grid-column: span 1; background: radial-gradient(circle at center, #5a2e2e, #1a1a1a); }
.item-4 { grid-column: span 2; background: linear-gradient(to right, #2a2a4a, #1a1a1a); }

.gallery-content {
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 20px;
  width: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
}

.gallery-content h3 {
  margin: 0;
  color: var(--text);
  font-size: 1.2rem;
}

/* --- VIEW: PHILOSOPHY --- */
.reading-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

.text-card {
  padding: 40px;
}

.text-body {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text-secondary);
}

.quote-list {
  margin-top: 40px;
}

.quote-item {
  margin-bottom: 25px;
  padding-left: 20px;
  border-left: 2px solid var(--border2);
}

.quote-item.highlight {
  border-left-color: var(--lp);
  background: rgba(196, 77, 255, 0.03); /* Subtle purple tint */
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
}

.quote-item p {
  font-size: 1.2rem;
  font-style: italic;
  color: var(--text);
  margin: 0 0 8px 0;
}

.quote-meta {
  font-size: 0.9rem;
  color: var(--sub);
}

/* --- ANIMATIONS --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* --- MOBILE --- */
@media (max-width: 768px) {
  .hero-title { font-size: 4rem; }
  .reading-layout { grid-template-columns: 1fr; }
  .gallery-masonry { grid-template-columns: 1fr; grid-auto-rows: 250px; }
  .item-1, .item-4 { grid-column: span 1; grid-row: span 1; }
  .sticky-nav { top: -1px; } /* Fix iOS Safari gap */
  .nav-row { gap: 15px; overflow-x: auto; }
}
</style>