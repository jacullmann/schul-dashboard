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
    title: 'The Context',
    content: "Released in 2010, 'My Beautiful Dark Twisted Fantasy' was born from self-imposed exile. Following the 2009 VMA controversy, West retreated to Hawaii to escape the public eye. What emerged was a redemption arc in the form of a maximalist masterpiece that Pitchfork infamously awarded a perfect 10/10."
  },
  {
    id: 'making',
    title: 'The Process',
    content: "Recorded at Avex Honolulu Studios, the sessions were dubbed 'Rap Camp.' West enforced strict rules (no tweeting, formal wear required) and recruited an all-star committee including Jay-Z, Bon Iver, and RZA. The production utilized 'maximalism'—layering samples, orchestras, and synths to create a sonic wall of sound."
  },
  {
    id: 'themes',
    title: 'The Meaning',
    content: "The album is a Greek tragedy of the modern celebrity. It explores the dichotomy of the American Dream—the excess of fame ('Power', 'Monster') versus the crushing loneliness and self-destruction that follows ('Runaway', 'Blame Game'). It is an apologetic, yet arrogant, exploration of the ego."
  }
];

const tracks: Track[] = [
  {
    "number": 1,
    "title": "Dark Fantasy",
    "features": ["Teyana Taylor", "Bon Iver", "Nicki Minaj"],
    "duration": "4:40",
    "description": "The curtain raiser. Opens with a fairy-tale narration by Nicki Minaj before exploding into a choral, orchestral production asking: 'Can we get much higher?'",
    "theme": "Grandeur & Escapism"
  },
  {
    "number": 2,
    "title": "Gorgeous",
    "features": ["Kid Cudi", "Raekwon"],
    "duration": "5:57",
    "description": "A guitar-driven track featuring distorted vocals. West tackles social injustice and his own public perception with some of his sharpest lyricism.",
    "theme": "Injustice & Legacy"
  },
  {
    "number": 3,
    "title": "Power",
    "features": [],
    "duration": "4:52",
    "description": "The comeback anthem. Built on a King Crimson sample, it’s a dense, tribal, arena-shaking declaration of authority and the perils of influence.",
    "theme": "Ego & Influence"
  },
  {
    "number": 4,
    "title": "All of the Lights (Interlude)",
    "features": [],
    "duration": "1:02",
    "description": "A melancholic orchestral prelude composed primarily of cello and piano, setting the stage for the mania to follow.",
    "theme": "Anticipation"
  },
  {
    "number": 5,
    "title": "All of the Lights",
    "features": ["Rihanna", "Kid Cudi", "Elton John", "Fergie"],
    "duration": "4:59",
    "description": "A sonic overload featuring vocals from 14 different artists. It’s a bright, chaotic pop-rap synthesis about the blinding nature of fame.",
    "theme": "Celebrity & Chaos"
  },
  {
    "number": 6,
    "title": "Monster",
    "features": ["Jay-Z", "Rick Ross", "Nicki Minaj", "Bon Iver"],
    "duration": "6:18",
    "description": "A horror-core posse cut. Famous for Nicki Minaj's career-defining verse, it embraces the public's view of West as a 'monster.'",
    "theme": "Horror & Aggression"
  },
  {
    "number": 7,
    "title": "So Appalled",
    "features": ["Swizz Beatz", "Jay-Z", "Pusha T", "Cyhi the Prynce", "RZA"],
    "duration": "6:38",
    "description": "A gritty, boom-bap cypher that looks at the dark side of wealth. The mood is somber, rejecting the very luxury they possess.",
    "theme": "Disillusionment"
  },
  {
    "number": 8,
    "title": "Devil in a New Dress",
    "features": ["Rick Ross"],
    "duration": "5:52",
    "description": "Widely considered the best production on the album. A soulful, Smokey Robinson-sampling track featuring a legendary guitar solo and Rick Ross verse.",
    "theme": "Lust & Sin"
  },
  {
    "number": 9,
    "title": "Runaway",
    "features": ["Pusha T"],
    "duration": "9:08",
    "description": "The album's centerpiece. A nine-minute toast to the 'douchebags,' featuring a simple haunting piano note and a long, distorted vocoder outro.",
    "theme": "Self-Sabotage & Acceptance"
  },
  {
    "number": 10,
    "title": "Hell of a Life",
    "features": [],
    "duration": "5:27",
    "description": "Fueled by a Black Sabbath interpolation, this dirty, industrial synth track explores the blurred lines between fantasy, religion, and pornography.",
    "theme": "Hedonism & Desire"
  },
  {
    "number": 11,
    "title": "Blame Game",
    "features": ["John Legend"],
    "duration": "7:49",
    "description": "A raw look at a failing relationship, ending with a surreal, lengthy comedic skit by Chris Rock that recontextualizes the sadness.",
    "theme": "Heartbreak & Toxicity"
  },
  {
    "number": 12,
    "title": "Lost in the World",
    "features": ["Bon Iver"],
    "duration": "4:16",
    "description": "A tribal-pop fusion sampling Bon Iver's 'Woods'. It serves as the frenetic, emotional climax of the record.",
    "theme": "Confusion & Unity"
  },
  {
    "number": 13,
    "title": "Who Will Survive in America",
    "features": [],
    "duration": "1:38",
    "description": "A coda sampling Gil Scott-Heron’s spoken word poem, leaving the listener with a lingering question about the African-American experience.",
    "theme": "Political Coda"
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
        <div class="lr-badge">Roc-A-Fella / Def Jam • 2010</div>
        <h1 class="lr-title">My Beautiful Dark <span class="text-gold">Twisted Fantasy</span></h1>
        <p class="lr-subtitle">A Maximalist Hip-Hop Opera</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/20r762YmB5HeofjMCiPMLv?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "We need more reverb. No, more reverb. Even more."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">10/10</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"A blast of auto-tuned grandeur and ego."</p>
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
/* --- CSS Variables for the "MBDTF" Palette --- */
/* Updated to Red, Gold, Black, and Olive (inspired by George Condo Art/Packaging) */
.lr-container {
  --lr-maroon: #5b0a0a; /* Deep Blood Red Background */
  --lr-maroon-light: #961919; /* Brighter Crimson */
  --lr-gold: #f5c542; /* Bright Gold */
  --lr-gold-dim: #b8860b; /* Antique Gold */
  --lr-cream: #FFFDD0; /* Cream/Canvas */
  --lr-text-muted: #e6b8bd; /* Light Pinkish Grey */
  --lr-glass: rgba(0, 0, 0, 0.6); /* Darker glass for contrast against red */

  background-color: var(--lr-maroon);
  color: var(--lr-cream);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

/* Background Texture - Updated gradient */
.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 50% 20%, #a31621 0%, #2b0305 85%);
  opacity: 0.9;
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
  font-family: 'Georgia', serif;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.text-gold {
  color: var(--lr-gold);
}

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 300;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-gold);
  color: #2b0305;
  padding: 0.25rem 0.75rem;
  font-weight: 800;
  font-size: 0.75rem;
  border-radius: 2px; /* Sharper corners for MBDTF feel */
  margin-bottom: 1rem;
  text-transform: uppercase;
}

/* Player Wrapper */
.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 30px 60px rgba(0,0,0,0.6);
  border-radius: 12px;
  background: #000;
  border: 4px solid var(--lr-gold); /* Added gold border for the frame effect */
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
  border-bottom: 1px solid rgba(245, 197, 66, 0.3);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Georgia', serif;
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
  border: 1px solid rgba(245, 197, 66, 0.4);
}

.lr-card-title {
  font-family: 'Georgia', serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-cream);
  text-transform: uppercase;
}

.lr-card-text {
  line-height: 1.8;
  color: #f0f0f0;
}

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--lr-gold);
  font-style: italic;
  font-family: 'Georgia', serif;
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
  font-family: 'Georgia', serif;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--lr-text-muted);
}

/* Tracklist */
.lr-section-title {
  font-family: 'Georgia', serif;
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
  border-bottom: 1px solid rgba(255, 253, 208, 0.1);
  padding: 1rem 0;
  cursor: pointer;
  transition: background 0.2s;
}

.lr-track-item:hover {
  background: rgba(255, 255, 255, 0.1);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Georgia', serif;
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