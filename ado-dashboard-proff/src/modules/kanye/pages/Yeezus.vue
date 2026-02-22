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
    content: "Released in 2013, 'Yeezus' was a deliberate jarring left turn. After the perfectionist maximalism of his previous work, West embraced 'anti-music.' Recorded primarily in Paris, it abandoned radio-friendly structures for industrial noise, acid house, and punk energy. It remains his most polarizing and abrasive work."
  },
  {
    id: 'making',
    title: 'The Process',
    content: "The album was constructed in a frantic, last-minute dash. West brought in legendary producer Rick Rubin just weeks before the deadline to act as a 'reducer.' They stripped the beats down to their bare skeletons—removing basslines, melodies, and comfort—leaving only the most aggressive elements."
  },
  {
    id: 'themes',
    title: 'The Meaning',
    content: "Yeezus is primal scream therapy. It attacks the fashion industry, the prison industrial complex, and West's own contradictions. It explores the frustration of the black creative in a white-dominated space, toggling between a 'God' complex and intense vulnerability/insecurity."
  }
];

const tracks: Track[] = [
  {
    "number": 1,
    "title": "On Sight",
    "features": ["Daft Punk"],
    "duration": "2:36",
    "description": "A harsh electronic glitch-opener that immediately alienates the listener. It declares the death of 'smooth' Kanye with the line: 'How much do I not give a f***?'",
    "theme": "Aggression & Distortion"
  },
  {
    "number": 2,
    "title": "Black Skinhead",
    "features": ["Daft Punk"],
    "duration": "3:08",
    "description": "A glam-rock stomper driven by tribal drums and panting breaths. West addresses interracial relationships and the media's portrayal of him with punk-rock ferocity.",
    "theme": "Power & Rebellion"
  },
  {
    "number": 3,
    "title": "I Am a God",
    "features": ["God"],
    "duration": "3:51",
    "description": "Inspired by a diss from a fashion designer, this track features literal screams of frustration. It is the apex of West's megalomania mixed with deep insecurity.",
    "theme": "Ego & Blasphemy"
  },
  {
    "number": 4,
    "title": "New Slaves",
    "features": ["Frank Ocean"],
    "duration": "4:16",
    "description": "A minimalist critique of modern consumerism and the private prison system. It ends with a soaring, classic rock sample section featuring Frank Ocean.",
    "theme": "Systemic Racism"
  },
  {
    "number": 5,
    "title": "Hold My Liquor",
    "features": ["Chief Keef", "Justin Vernon"],
    "duration": "5:26",
    "description": "An unlikely collision of Drill music and Indie Folk. A hazy, intoxicated narrative about a failed relationship and the inability to control one's impulses.",
    "theme": "Intoxication & Regret"
  },
  {
    "number": 6,
    "title": "I'm In It",
    "features": ["Assassin", "Justin Vernon"],
    "duration": "3:54",
    "description": "The most sexually explicit and sonically chaotic track on the album. It fuses dancehall vocals with industrial sirens and heavy breathing.",
    "theme": "Lust & Excess"
  },
  {
    "number": 7,
    "title": "Blood on the Leaves",
    "features": [],
    "duration": "6:00",
    "description": "Samples Nina Simone's 'Strange Fruit'—a song about lynching—and juxtaposes it against a story of fame and divorce. The beat drop is earth-shattering.",
    "theme": "Betrayal & Fame"
  },
  {
    "number": 8,
    "title": "Guilt Trip",
    "features": ["Kid Cudi"],
    "duration": "4:03",
    "description": "A space-age ballad featuring synths that sound like lasers. Kid Cudi delivers a haunting bridge in this sad, futuristic love song.",
    "theme": "Isolation"
  },
  {
    "number": 9,
    "title": "Send It Up",
    "features": ["King L"],
    "duration": "2:58",
    "description": "An industrial club banger with a beat that sounds like a distress signal. It’s abrasive, repetitive, and unapologetically Chicago.",
    "theme": "Hedonism"
  },
  {
    "number": 10,
    "title": "Bound 2",
    "features": ["Charlie Wilson"],
    "duration": "3:49",
    "description": "The plot twist. After 35 minutes of noise, the album ends with a soulful, sample-heavy love song. It is the sarcastic 'happy ending' to the movie.",
    "theme": "Love & Irony"
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
        <div class="lr-badge">Def Jam / Roc-A-Fella • 2013</div>
        <h1 class="lr-title">YEE<span class="text-gold">ZUS</span></h1>
        <p class="lr-subtitle">God Level Minimalism</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/album/7D2NdGvBHIavgLhmcwhluK?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "For us, sound is about making the texture... rougher."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">9.5</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"An attack on everything. Minimal, aggressive, and essential."</p>
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
/* --- CSS Variables for the "YEEZUS" Palette --- */
/* Palette: Concrete Grey, Metallic Silver, CD Case Clear, and "Red Tape" Neon */
.lr-container {
  --lr-maroon: #1a1a1a;       /* Dark Concrete Grey Background */
  --lr-maroon-light: #333333; /* Lighter Grey */
  --lr-gold: #ff3e3e;         /* The Iconic "Red Tape" Color */
  --lr-gold-dim: #999999;     /* Metallic Silver */
  --lr-cream: #f0f0f0;        /* Off-White / CD Plastic */
  --lr-text-muted: #888888;   /* Industrial Grey text */
  --lr-glass: rgba(255, 255, 255, 0.05); /* Subtle white noise glass */

  background-color: var(--lr-maroon);
  color: var(--lr-cream);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; /* Clean Sans-Serif */
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

/* Background Texture - Industrial Noise/Gradient */
.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #0d0d0d 0%, #262626 100%);
  opacity: 0.9;
  z-index: 0;
}

.lr-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

/* Typography - Shifted to Bold/Blocky Sans-Serif */
.lr-title {
  font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: -2px; /* Tight tracking like the album cover */
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.text-gold {
  color: var(--lr-gold);
}

.lr-subtitle {
  font-family: 'Courier New', monospace; /* Technical feel */
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

.lr-badge {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--lr-text-muted);
  color: var(--lr-text-muted);
  padding: 0.25rem 0.75rem;
  font-weight: 600;
  font-size: 0.75rem;
  border-radius: 0px; /* Sharp corners */
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Player Wrapper - Minimalist CD Case style */
.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  border-radius: 0px; /* No curves */
  background: #000;
  border-right: 15px solid var(--lr-gold); /* The Red Tape on the side */
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
  border-bottom: 1px solid var(--lr-maroon-light);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Arial', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
  text-transform: uppercase;
}

.lr-tab-btn.active {
  color: var(--lr-cream);
  border-bottom: 4px solid var(--lr-gold); /* Thicker active line */
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(5px);
  padding: 2rem;
  border-radius: 0px;
  border: 1px solid var(--lr-maroon-light);
}

.lr-card-title {
  font-family: 'Arial Black', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  letter-spacing: -1px;
}

.lr-card-text {
  line-height: 1.6;
  font-family: 'Helvetica', sans-serif;
  color: #cccccc;
}

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 4px solid var(--lr-gold);
  font-style: normal;
  font-weight: bold;
  font-family: 'Helvetica', sans-serif;
  font-size: 1.2rem;
  color: var(--lr-cream);
  text-transform: uppercase;
}

.lr-review-badge {
  margin-top: 2rem;
  background: #000;
  padding: 1rem;
  border-radius: 0px;
  text-align: center;
  border: 1px solid var(--lr-maroon-light);
}

.score {
  display: block;
  font-size: 3rem;
  font-weight: 900;
  color: var(--lr-cream);
  font-family: 'Arial Black', sans-serif;
  line-height: 1;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--lr-gold);
  font-weight: bold;
}

/* Tracklist */
.lr-section-title {
  font-family: 'Arial Black', sans-serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  letter-spacing: -1px;
}

.lr-tracklist {
  list-style: none;
  padding: 0;
}

.lr-track-item {
  border-bottom: 1px solid var(--lr-maroon-light);
  padding: 1rem 0;
  cursor: pointer;
  transition: background 0.1s;
}

.lr-track-item:hover {
  background: rgba(255, 62, 62, 0.1); /* Red tint on hover */
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Courier New', monospace;
  color: var(--lr-gold);
  font-size: 1.2rem;
  font-weight: bold;
  width: 40px;
}

.track-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.track-title {
  font-family: 'Arial', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--lr-cream);
  text-transform: uppercase;
}

.track-feat {
  font-size: 0.85rem;
  color: var(--lr-text-muted);
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.track-dur {
  font-family: monospace;
  color: var(--lr-text-muted);
}

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: #111;
  border-radius: 0px;
  border-left: 4px solid var(--lr-gold);
  animation: slideDown 0.2s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-gold);
  margin-bottom: 0.5rem;
  letter-spacing: 2px;
  font-weight: 900;
}

/* Animations */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>