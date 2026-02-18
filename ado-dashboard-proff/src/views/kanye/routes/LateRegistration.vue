<script setup lang="ts">
import { ref } from 'vue';
import BackButton from "@/views/kanye/buttons/BackButton.vue";

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
    title: 'The History',
    content: "Released in 2005, 'Late Registration' marked a pivotal shift in hip-hop. Moving away from the sped-up soul samples of 'The College Dropout', West collaborated with film composer Jon Brion. The result was a lush, orchestral soundscape featuring a 20-piece ensemble, transforming rap into a cinematic experience."
  },
  {
    id: 'making',
    title: 'The Making',
    content: "Recording sessions took place at Sony Music Studios in NYC and the Record Plant in Hollywood. West experimented with instruments rarely used in hip-hop at the time, including celestas, harpsichords, and Chinese bells. The collaboration with Jon Brion brought a baroque pop sensibility that bridged the gap between street anthems and symphony halls."
  },
  {
    id: 'themes',
    title: 'The Meaning',
    content: "The album tackles complex themes: institutional racism ('Crack Music'), the blood diamond trade ('Diamonds from Sierra Leone'), and the healthcare system ('Roses'). It balances these heavy topics with moments of pure joy ('Touch the Sky') and deep familial love ('Hey Mama'), presenting a holistic view of the Black American experience."
  }
];

const tracks: Track[] = [
  {
    "number": 1,
    "title": "Wake Up Mr. West",
    "features": [],
    "duration": "0:41",
    "description": "The album's intro featuring a skit with Bernie Mac. It sets a dreamy, humorous tone, transitioning from a restless sleep into the music.",
    "theme": "Dream Sequence & Intro"
  },
  {
    "number": 2,
    "title": "Heard 'Em Say",
    "features": ["Adam Levine"],
    "duration": "3:23",
    "description": "A pensive, piano-driven opening that contrasts the harsh realities of life with a hopeful melody.",
    "theme": "Resilience & Reality"
  },
  {
    "number": 3,
    "title": "Touch the Sky",
    "features": ["Lupe Fiasco"],
    "duration": "3:57",
    "description": "The triumphant anthem of the album. Using a slowed-down Curtis Mayfield sample, it captures the feeling of finally 'making it'.",
    "theme": "Celebration & Ambition"
  },
  {
    "number": 4,
    "title": "Gold Digger",
    "features": ["Jamie Foxx"],
    "duration": "3:28",
    "description": "A cultural phenomenon. Blending Ray Charles's blues with modern bounce, it's a cautionary tale wrapped in an infectious pop hook.",
    "theme": "Relationships & Warning"
  },
  {
    "number": 5,
    "title": "Skit #1",
    "features": [],
    "duration": "0:33",
    "description": "A comedic interlude introducing the fictional fraternity 'Broke Phi Broke,' satirizing the struggle of being broke while trying to maintain status.",
    "theme": "Humor & Satire"
  },
  {
    "number": 6,
    "title": "Drive Slow",
    "features": ["Paul Wall", "GLC"],
    "duration": "4:32",
    "description": "A smooth, jazz-inflected track that uses car culture as a metaphor for navigating life's pace.",
    "theme": "Patience & Atmosphere"
  },
  {
    "number": 7,
    "title": "My Way Home",
    "features": ["Common"],
    "duration": "1:43",
    "description": "A soulful interlude performed by Common. It samples Gil Scott-Heron to reflect on the journey of finding one's place in the world.",
    "theme": "Searching & Belonging"
  },
  {
    "number": 8,
    "title": "Crack Music",
    "features": ["The Game"],
    "duration": "4:31",
    "description": "A militant, drum-heavy track that draws parallels between the addiction of crack cocaine and the consumption of black music in America.",
    "theme": "Politics & Historical Commentary"
  },
  {
    "number": 9,
    "title": "Roses",
    "features": [],
    "duration": "4:05",
    "description": "One of West's most vulnerable tracks, detailing his grandmother's hospitalization and critiquing the disparity in healthcare.",
    "theme": "Family & Systemic Critique"
  },
  {
    "number": 10,
    "title": "Bring Me Down",
    "features": ["Brandy"],
    "duration": "3:18",
    "description": "An orchestral track featuring powerful vocals from Brandy, where West defiantly addresses his critics and doubters.",
    "theme": "Defiance & Self-Worth"
  },
  {
    "number": 11,
    "title": "Addiction",
    "features": [],
    "duration": "4:27",
    "description": "Built on an Etta James sample, this track explores the seductive and destructive nature of various vices, from money to lust.",
    "theme": "Vulnerability & Temptation"
  },
  {
    "number": 12,
    "title": "Skit #2",
    "features": [],
    "duration": "0:31",
    "description": "A continuation of the 'Broke Phi Broke' narrative, emphasizing the theme of anti-materialism through comedy.",
    "theme": "Humor & Satire"
  },
  {
    "number": 13,
    "title": "Diamonds from Sierra Leone (Remix)",
    "features": ["Jay-Z"],
    "duration": "3:53",
    "description": "A dichotomy of wealth and war. It juxtaposes the luxury of rap jewelry with the civil wars fueled by the diamond trade.",
    "theme": "Consciousness & Conflict"
  },
  {
    "number": 14,
    "title": "We Major",
    "features": ["Nas", "Really Doe"],
    "duration": "7:28",
    "description": "An expansive, maximalist celebration of success. The track builds continuously with horns and choirs, featuring a legendary verse from Nas.",
    "theme": "Triumph & Excess"
  },
  {
    "number": 15,
    "title": "Skit #3",
    "features": [],
    "duration": "0:24",
    "description": "Another humorous segment with the fraternity, reinforcing the outsider status of the album's persona.",
    "theme": "Humor & Satire"
  },
  {
    "number": 16,
    "title": "Hey Mama",
    "features": [],
    "duration": "5:05",
    "description": "A heartfelt ballad dedicated to Donda West. It stands as the emotional core of the album, celebrating unconditional maternal love.",
    "theme": "Love & Gratitude"
  },
  {
    "number": 17,
    "title": "Celebration",
    "features": [],
    "duration": "3:18",
    "description": "A laid-back, joyful track that focuses on enjoying the moment and the fruits of hard work.",
    "theme": "Joy & Nostalgia"
  },
  {
    "number": 18,
    "title": "Skit #4",
    "features": [],
    "duration": "1:18",
    "description": "The final chapter of the 'Broke Phi Broke' saga, concluding the comedic subplot of the album.",
    "theme": "Humor & Satire"
  },
  {
    "number": 19,
    "title": "Gone",
    "features": ["Consequence", "Cam'ron"],
    "duration": "6:02",
    "description": "Featuring an Otis Redding sample and a complex string arrangement, this track showcases West's lyrical dexterity and orchestral vision.",
    "theme": "Fame & Transitions"
  },
  {
    "number": 20,
    "title": "Diamonds from Sierra Leone (Bonus Track)",
    "features": [],
    "duration": "3:58",
    "description": "The original version of the single, focusing more on West's rise to fame and his status within the Roc-A-Fella dynasty.",
    "theme": "Legacy & Braggadocio"
  },
  {
    "number": 21,
    "title": "Late",
    "features": [],
    "duration": "3:50",
    "description": "A hidden track that playfully addresses procrastination and the pressure of expectations, fittingly closing the album.",
    "theme": "Procrastination & Expectation"
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
        <div class="lr-badge">Def Jam Recordings • 2005</div>
        <h1 class="lr-title">Late <span class="text-gold">Registration</span></h1>
        <p class="lr-subtitle">An Orchestral Hip-Hop Masterpiece</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/album/5ll74bqtkcXlKE7wwkMq4g?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "We transformed the hip-hop beat into a film score."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">10/10</span>
            <span class="source">Retrospective Classic</span>
            <p>"A triumph of baroque pop and soulful rap."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title">Select Composition</h2>
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
/* --- CSS Variables for the "Late Registration" Palette --- */
.lr-container {
  --lr-maroon: #2d0a10;
  --lr-maroon-light: #4a0e16;
  --lr-gold: #d4af37;
  --lr-gold-dim: #8a7020;
  --lr-cream: #fdfcf5;
  --lr-text-muted: #c2b0b3;
  --lr-glass: rgba(74, 14, 22, 0.7);

  background-color: var(--lr-maroon);
  color: var(--lr-cream);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

/* Background Texture */
.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 50% 30%, #5e121c 0%, var(--lr-maroon) 70%);
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
  font-family: 'Georgia', serif;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.text-gold {
  color: var(--lr-gold);
}

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-gold);
  color: var(--lr-maroon);
  padding: 0.25rem 0.75rem;
  font-weight: bold;
  font-size: 0.75rem;
  border-radius: 99px;
  margin-bottom: 1rem;
  text-transform: uppercase;
}

/* Player Wrapper */
.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border-radius: 12px;
  background: #000;
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
  border-bottom: 1px solid rgba(255,255,255,0.1);
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
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.2);
}

.lr-card-title {
  font-family: 'Georgia', serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-cream);
}

.lr-card-text {
  line-height: 1.8;
  color: #e0e0e0;
}

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--lr-gold);
  font-style: italic;
  font-size: 1.1rem;
  color: var(--lr-gold);
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.score {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: var(--lr-gold);
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
}

.lr-tracklist {
  list-style: none;
  padding: 0;
}

.lr-track-item {
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 1rem 0;
  cursor: pointer;
  transition: background 0.2s;
}

.lr-track-item:hover {
  background: rgba(255,255,255,0.05);
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
  font-weight: 600;
  font-size: 1.1rem;
}

.track-feat {
  font-size: 0.85rem;
  color: var(--lr-text-muted);
}

.track-dur {
  font-family: monospace;
  color: var(--lr-text-muted);
}

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  border-left: 2px solid var(--lr-gold);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-gold);
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
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