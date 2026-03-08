<script setup lang="ts">
import { ref } from 'vue';
import BackButton from "@/modules/kanye/components/BackButton.vue";

// --- Types ---
interface Track {
  number: number;
  title: string;
  features: string[];
  duration: string;
  description: string;
  theme: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
}

// --- Data ---
const activeTab = ref<string>('history');
const expandedTrack = ref<number | null>(null);

const sections: Section[] = [
  {
    id: 'history',
    title: 'The Context',
    content: "Released in 2018, 'ye' emerged from the chaos of the Wyoming Sessions. Following his hospitalization and controversial TMZ outburst, West scrapped his original album and produced this 7-track project in just two weeks. It stands as a raw, real-time documentation of his mental health diagnosis."
  },
  {
    id: 'making',
    title: 'The Process',
    content: "Recorded at Jackson Hole's West Lake Ranch, the album was part of the 'Wyoming 7' series. The cover art was shot by West on his iPhone on the way to the listening party, with the scribbled text added moments before release. The production is sparse, relying on soul samples and unpolished vocals."
  },
  {
    id: 'themes',
    title: 'The Meaning',
    content: "West labeled this his 'superpower.' The album deconstructs the bipolar experience, swinging wildly from suicidal ideation ('I Thought About Killing You') to manic euphoria ('Yikes') and eventual tenderness ('Violent Crimes'). It is an uncomfortable, intimate look into a fractured mind."
  }
];

const tracks: Track[] = [
  {
    "number": 1,
    "title": "I Thought About Killing You",
    "features": [],
    "duration": "4:34",
    "description": "A spoken-word confessional that acts as a therapy session. The beat switches halfway from minimal synth to a frenetic, trapped-out drum breakdown.",
    "theme": "Suicide & Mania"
  },
  {
    "number": 2,
    "title": "Yikes",
    "features": [],
    "duration": "3:08",
    "description": "The radio hit. West embraces his 'raging' thoughts, addressing the TMZ controversy and declaring his condition a superpower, not a disability.",
    "theme": "Acceptance & Drugs"
  },
  {
    "number": 3,
    "title": "AppLogoutButton Mine",
    "features": ["Ty Dolla $ign", "Ant Clemons"],
    "duration": "2:25",
    "description": "A stripped-back, bass-heavy track focused on infidelity and temptation. It features falsetto vocals from Ant Clemons and a catchy hook by Ty Dolla $ign.",
    "theme": "Lust & Ego"
  },
  {
    "number": 4,
    "title": "Wouldn't Leave",
    "features": ["PARTYNEXTDOOR", "Jeremih", "Ty Dolla $ign"],
    "duration": "3:25",
    "description": "A softer moment addressing the strain his public outbursts put on his marriage. It serves as a public apology and a testament to loyalty.",
    "theme": "Family & Regret"
  },
  {
    "number": 5,
    "title": "No Mistakes",
    "features": ["Kid Cudi", "Charlie Wilson"],
    "duration": "2:03",
    "description": "A soulful, uplifting track sampling Slick Rick. It feels like a brief moment of clarity and confidence amidst the album's chaos.",
    "theme": "Redemption"
  },
  {
    "number": 6,
    "title": "Ghost Town",
    "features": ["070 Shake", "Kid Cudi", "PARTYNEXTDOOR"],
    "duration": "4:31",
    "description": "The emotional climax. A rock-rap anthem about numbness and freedom. 070 Shake's outro is considered one of the defining moments of the Wyoming era.",
    "theme": "Freedom & Pain"
  },
  {
    "number": 7,
    "title": "Violent Crimes",
    "features": ["070 Shake", "Ty Dolla $ign", "Nicki Minaj"],
    "duration": "3:35",
    "description": "The lullaby closer. West reflects on how fatherhood changed his view of women, wishing he could shield his daughters from the world.",
    "theme": "Fatherhood & Fear"
  }
];

// --- Methods ---
const toggleTrack = (trackNum: number) => {
  if (expandedTrack.value === trackNum) {
    expandedTrack.value = null;
  } else {
    expandedTrack.value = trackNum;
  }
};
</script>

<template>
  <div class="lr-container">
    <BackButton />
    <div class="lr-bg-overlay"></div>

    <main class="lr-content">
      <header class="lr-header">
        <div class="lr-badge">GOOD Music / Def Jam • 2018</div>
        <h1 class="lr-title">ye</h1>
        <p class="lr-subtitle"><span class="text-neon">I hate being Bi-Polar</span> its awesome</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/album/2Ek1q2haOnxVqhvVKqMvJe?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
      </section>

      <div class="lr-grid">

        <div class="lr-col-info">
          <nav class="lr-tabs">
            <button
                v-for="section in sections"
                :key="section.id"
                @click="activeTab = section.id"
                :class="['lr-tab-btn', { active: activeTab === section.id }]"
            >
              {{ section.title }}
            </button>
          </nav>

          <transition name="fade" mode="out-in">
            <article :key="activeTab" class="lr-info-card">
              <h3 class="lr-card-title">{{ sections.find(s => s.id === activeTab)?.title }}</h3>
              <p class="lr-card-text">{{ sections.find(s => s.id === activeTab)?.content }}</p>

              <div v-if="activeTab === 'making'" class="lr-quote">
                "I took the photo on the way to the listening party."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">7.1</span>
            <span class="source">Pitchfork • General Review</span>
            <p>"A chaotic, messy edit of a life."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title">The Tracklist</h2>
          <ul class="lr-tracklist">
            <li
                v-for="track in tracks"
                :key="track.number"
                class="lr-track-item"
                :class="{ 'is-expanded': expandedTrack === track.number }"
                @click="toggleTrack(track.number)"
            >
              <div class="lr-track-header">
                <span class="track-num">{{ track.number < 10 ? `0${track.number}` : track.number }}</span>
                <div class="track-info">
                  <span class="track-title">{{ track.title }}</span>
                  <span v-if="track.features.length" class="track-feat">ft. {{ track.features.join(', ') }}</span>
                </div>
                <span class="track-dur">{{ track.duration }}</span>
              </div>

              <div class="lr-track-details" v-if="expandedTrack === track.number">
                <div class="detail-theme">Theme: {{ track.theme }}</div>
                <p>{{ track.description }}</p>
              </div>
            </li>
          </ul>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* --- CSS Variables for the "ye" Palette --- */
/* Palette: Wyoming Mountains (Slate), Snow (White), and Highlighter Green */
.lr-container {
  --lr-maroon: #2c3e50; /* Changed from Red to Deep Slate Blue/Grey */
  --lr-maroon-light: #34495e; /* Lighter Slate */
  --lr-gold: #39ff14; /* Changed from Gold to Neon Green */
  --lr-gold-dim: #2ecc71; /* Dimmer Green */
  --lr-cream: #ecf0f1; /* Cool White/Snow */
  --lr-text-muted: #bdc3c7; /* Light Grey */
  --lr-glass: rgba(0, 0, 0, 0.4); /* Darker glass */

  background-color: var(--lr-maroon);
  color: var(--lr-cream);
  /* Changed from Helvetica to monospace to fit the "Scribble" aesthetic */
  font-family: 'Courier New', Courier, monospace;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

/* Background Texture - Updated to linear gradient (Sky to Mountain) */
.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  /* Wyoming sky gradient */
  background: linear-gradient(180deg, #5D7C89 0%, #1a252f 100%);
  opacity: 0.8;
  z-index: 0;
}

.lr-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

/* Typography */
.lr-title {
  font-family: 'Courier New', Courier, monospace; /* Raw text style */
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -2px; /* Tighter tracking */
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: lowercase; /* "ye" is usually lowercase */
}

.text-neon {
  color: var(--lr-gold);
  font-weight: bold;
}

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-cream);
  letter-spacing: 1px;
  text-transform: none; /* Handwritten feel */
  font-weight: 300;
  font-style: italic;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-gold);
  color: #000;
  padding: 0.25rem 0.75rem;
  font-weight: 800;
  font-size: 0.75rem;
  border-radius: 0px; /* Boxy look */
  margin-bottom: 1rem;
  text-transform: uppercase;
}

/* Player Wrapper */
.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 30px 60px rgba(0,0,0,0.4);
  border-radius: 12px;
  background: #000;
  border: 1px solid var(--lr-gold); /* Thin neon border */
}

/* Grid Layout */
.lr-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
}

@media (min-width: 768px) {
  .lr-grid {
    grid-template-columns: 1fr 1.5fr;
  }
}

/* Tabs & Info Card */
.lr-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(57, 255, 20, 0.3);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
}

.lr-tab-btn.active {
  color: var(--lr-gold);
  border-bottom: 2px solid var(--lr-gold);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 4px;
  border: 1px solid rgba(57, 255, 20, 0.2);
}

.lr-card-title {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  font-weight: bold;
}

.lr-card-text {
  line-height: 1.6;
  color: #ecf0f1;
}

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--lr-gold);
  font-style: italic;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.2rem;
  color: var(--lr-gold);
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.5);
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  border: 1px solid var(--lr-maroon-light);
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--lr-gold);
  font-family: 'Courier New', Courier, monospace;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--lr-text-muted);
}

/* Tracklist */
.lr-section-title {
  font-family: 'Courier New', Courier, monospace;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-gold);
  text-transform: uppercase;
}

.lr-tracklist {
  list-style: none;
  padding: 0;
}

.lr-track-item {
  border-bottom: 1px solid rgba(236, 240, 241, 0.1);
  padding: 1rem 0;
  cursor: pointer;
  transition: background 0.2s;
}

.lr-track-item:hover {
  background: rgba(255, 255, 255, 0.05);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Courier New', Courier, monospace;
  color: var(--lr-gold-dim);
  font-size: 1.2rem;
  width: 40px;
}

.track-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.track-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--lr-cream);
}

.track-feat {
  font-size: 0.85rem;
  color: var(--lr-text-muted);
  font-style: italic;
}

.track-dur {
  font-family: monospace;
  color: var(--lr-text-muted);
}

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.4);
  border-radius: 0px;
  border-left: 4px solid var(--lr-gold);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-gold);
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
  font-weight: bold;
}

/* Animations */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>