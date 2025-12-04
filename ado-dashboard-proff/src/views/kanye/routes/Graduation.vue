<script setup lang="ts">
import { ref } from 'vue';
import BackButton from "../buttons/BackButton.vue";

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
    title: 'The Battle',
    content: "Released in 2007, 'Graduation' marked the day gangster rap died. West famously went head-to-head in a sales battle with 50 Cent's 'Curtis'. Kanye won by a landslide, selling 957,000 copies in the first week, shifting the hip-hop paradigm from street tales to emotional vulnerability and stadium-sized anthems."
  },
  {
    id: 'making',
    title: 'The Glow',
    content: "Inspired by touring with U2 and The Rolling Stones, West wanted songs that worked in arenas. He simplified his rhymes and turned to house music (Daft Punk) and krautrock (Can) for inspiration. The aesthetic was defined by Takashi Murakami's 'Superflat' art, introducing the 'Glow in the Dark' visual era."
  },
  {
    id: 'themes',
    title: 'The Triumph',
    content: "This is the victory lap. If the first two albums were about the struggle to make it, 'Graduation' is about the view from the top. It explores the joy of success ('Good Life'), the pressure of fame ('Can't Tell Me Nothing'), and the realization that the 'good life' can still feel lonely ('I Wonder')."
  }
];

const tracks: Track[] = [
  {
    "number": 1,
    "title": "Good Morning",
    "features": [],
    "duration": "3:15",
    "description": "The wake-up call. Minimalist production with a hollow snare, welcoming the listener to the next level of education / fame.",
    "theme": "Awakening"
  },
  {
    "number": 2,
    "title": "Champion",
    "features": [],
    "duration": "2:47",
    "description": "A high-energy celebration sampling Steely Dan. It’s a pure dopamine hit about realizing your own potential.",
    "theme": "Victory"
  },
  {
    "number": 3,
    "title": "Stronger",
    "features": ["Daft Punk"],
    "duration": "5:12",
    "description": "The global smash. West flips 'Harder, Better, Faster, Stronger' into a sci-fi hip-hop anthem that defined the late 2000s.",
    "theme": "Resilience"
  },
  {
    "number": 4,
    "title": "I Wonder",
    "features": [],
    "duration": "4:03",
    "description": "An emotional centerpiece sampling Labi Siffre. It deals with finding your dreams and the hesitation that comes with chasing them.",
    "theme": "Dreams & Intuition"
  },
  {
    "number": 5,
    "title": "Good Life",
    "features": ["T-Pain"],
    "duration": "3:27",
    "description": "The ultimate summer track. Synths, T-Pain on the hook, and a Michael Jackson sample create a picture of pure luxury.",
    "theme": "Celebration"
  },
  {
    "number": 6,
    "title": "Can't Tell Me Nothing",
    "features": [],
    "duration": "4:31",
    "description": "The defiant street anthem. Slow, deliberate, and powerful, it captures Kanye's attitude toward his critics and his own conscience.",
    "theme": "Defiance"
  },
  {
    "number": 7,
    "title": "Barry Bonds",
    "features": ["Lil Wayne"],
    "duration": "3:24",
    "description": "A competitive braggadocio track featuring the other biggest rapper of the era, Lil Wayne, trading bars about hits.",
    "theme": "Competition"
  },
  {
    "number": 8,
    "title": "Drunk and Hot Girls",
    "features": ["Mos Def"],
    "duration": "5:13",
    "description": "A dark, waltzing interpolation of Can's 'Sing Swan Song'. Often cited as the album's most experimental and polarizing moment.",
    "theme": "Excess"
  },
  {
    "number": 9,
    "title": "Flashing Lights",
    "features": ["Dwele"],
    "duration": "3:57",
    "description": "Cinematic grandeur. Futuristic strings and synths create a neon-soaked backdrop for a story about paparazzi and relationships.",
    "theme": "Fame & Romance"
  },
  {
    "number": 10,
    "title": "Everything I Am",
    "features": ["DJ Premier"],
    "duration": "3:47",
    "description": "A quiet, piano-driven moment of introspection featuring scratches by DJ Premier. Kanye embraces his flaws as his greatest assets.",
    "theme": "Self-Acceptance"
  },
  {
    "number": 11,
    "title": "The Glory",
    "features": [],
    "duration": "3:32",
    "description": "Classic 'chipmunk soul' Kanye sped up to 140BPM. A fast-paced victory lap celebrating the Roc-A-Fella dynasty.",
    "theme": "Legacy"
  },
  {
    "number": 12,
    "title": "Homecoming",
    "features": ["Chris Martin"],
    "duration": "3:23",
    "description": "A stadium-rock crossover tribute to Chicago, personified as a lost love. Features Coldplay's Chris Martin on the piano.",
    "theme": "Nostalgia"
  },
  {
    "number": 13,
    "title": "Big Brother",
    "features": [],
    "duration": "4:47",
    "description": "A vulnerable ode to Jay-Z. West details their history as mentor and protege, covering both the love and the sibling rivalry.",
    "theme": "Mentorship"
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
        <div class="lr-badge">Roc-A-Fella / Def Jam • 2007</div>
        <h1 class="lr-title">Graduation</h1>
        <p class="lr-subtitle">Stadium Status • The Glow in the Dark</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/album/4SZko61aMnmgvNhfhgTuD3?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "I wanted to make music that I could play in stadiums. Anthems."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">8.7</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"A futuristic, stadium-pop masterpiece."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title">The Curriculum</h2>
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
/* --- CSS Variables for the "Graduation" Palette --- */
/* Colors: Takashi Murakami style - Purple, Hot Pink, Sky Blue, and Bright Gold */
.lr-container {
  --lr-primary: #3c1e70; /* Deep Purple */
  --lr-primary-light: #6a0dad; /* Brighter Violet */
  --lr-accent: #ff00ff; /* Hot Pink (The text/glow) */
  --lr-gold: #f9d342; /* Murakami Flower Yellow */
  --lr-sky: #4facfe; /* Sky Blue */
  --lr-cream: #ffffff; /* White text for contrast */
  --lr-text-muted: #dcd0ff; /* Lavender Grey */
  --lr-glass: rgba(45, 27, 78, 0.7); /* Purple glass */

  background-color: var(--lr-primary);
  color: var(--lr-cream);
  font-family: 'Futura', 'Trebuchet MS', Arial, sans-serif; /* Changed to Futura-style for Modernism */
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

/* Background Texture - Graduation Sky Gradient */
.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #2a0845 0%, #6441a5 50%, #fe5196 100%);
  opacity: 0.85;
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
  font-family: 'Futura', sans-serif; /* Geometric */
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  color: var(--lr-cream);
  text-shadow: 3px 3px 0px var(--lr-accent); /* Pop Art Drop Shadow */
}

/* Reusing the class, but mapping to the new gold variable */
.text-gold {
  color: var(--lr-gold);
}

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-gold);
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 700;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-accent); /* Hot Pink Badge */
  color: #fff;
  padding: 0.25rem 0.75rem;
  font-weight: 800;
  font-size: 0.75rem;
  border-radius: 20px; /* Rounder corners for Murakami vibe */
  margin-bottom: 1rem;
  text-transform: uppercase;
  box-shadow: 0 0 10px var(--lr-accent);
}

/* Player Wrapper */
.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 50px rgba(106, 13, 173, 0.5); /* Purple Glow */
  border-radius: 12px;
  background: #000;
  border: 4px solid var(--lr-gold);
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
  border-bottom: 2px solid rgba(255, 0, 255, 0.3);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Futura', sans-serif;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
  text-transform: uppercase;
}

.lr-tab-btn.active {
  color: var(--lr-accent);
  border-bottom: 3px solid var(--lr-accent);
  text-shadow: 0 0 8px var(--lr-accent);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(12px);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 0, 255, 0.2);
}

.lr-card-title {
  font-family: 'Futura', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-gold);
  text-transform: uppercase;
  font-weight: 800;
}

.lr-card-text {
  line-height: 1.8;
  color: #fff;
  font-weight: 400;
}

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 4px solid var(--lr-accent);
  font-style: italic;
  font-family: 'Georgia', serif; /* Keep Serif for quote to contrast */
  font-size: 1.2rem;
  color: var(--lr-gold);
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  border: 2px solid var(--lr-sky); /* Blue border */
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--lr-sky);
  font-family: 'Futura', sans-serif;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--lr-text-muted);
  font-weight: bold;
}

/* Tracklist */
.lr-section-title {
  font-family: 'Futura', sans-serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-gold);
  text-transform: uppercase;
  font-weight: 900;
  text-shadow: 2px 2px 0px #000;
}

.lr-tracklist {
  list-style: none;
  padding: 0;
}

.lr-track-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.lr-track-item:hover {
  background: rgba(255, 0, 255, 0.15); /* Pink hover */
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Futura', sans-serif;
  color: var(--lr-sky);
  font-weight: bold;
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
  text-transform: uppercase;
}

.track-feat {
  font-size: 0.85rem;
  color: var(--lr-gold); /* Gold features */
  font-style: italic;
}

.track-dur {
  font-family: monospace;
  color: var(--lr-text-muted);
}

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(60, 30, 112, 0.6);
  border-radius: 8px;
  border-left: 4px solid var(--lr-accent);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-accent);
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
  font-weight: 800;
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