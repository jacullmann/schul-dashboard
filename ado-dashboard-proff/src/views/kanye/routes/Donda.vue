<script setup lang="ts">
import { ref } from 'vue';
import BackButton from "@/views/kanye/buttons/BackButton.vue";

interface Track {
  number: number;
  title: string;
  features: string[];
  duration: string;
  description: string;
  theme: string;
  rating: number;
}

interface StarTrack {
  title: string;
  features: string[];
  duration: string;
  rating: number;
  description: string;
  whyStar: string;
  legacy: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
}

const activeTab = ref<string>('history');
const expandedTrack = ref<number | null>(null);
const expandedStar = ref<number | null>(null);

const sections: Section[] = [
  {
    id: 'history',
    title: 'The Saga',
    content: "Released on August 29, 2021, 'Donda' is named after West's late mother, Donda West, who passed away in November 2007. The album's rollout was one of the most chaotic in music history—three public listening events at Mercedes-Benz Stadium in Atlanta (where West literally lived in the stadium for weeks), constantly shifting tracklists, and a bitter public feud with Drake that coincided with the album's release. It debuted at #1 with 309,000 album-equivalent units."
  },
  {
    id: 'making',
    title: 'The Process',
    content: "Donda was years in the making, evolving from the scrapped 'Yandhi' sessions. West recruited a massive roster of collaborators including Jay-Z, The Weeknd, Lil Baby, Pop Smoke, Pusha T, Kid Cudi, Playboi Carti, Baby Keem, and many more. The production was handled by a battalion of producers and the sound blends gospel, drill, trap, ambient, and industrial elements. The iconic all-black cover art—a pure black square—was designed by artist Louise Bourgeois."
  },
  {
    id: 'themes',
    title: 'The Mother',
    content: "At its core, Donda is about loss, faith, and redemption—processed through the memory of Donda West. Her voice appears throughout via audio recordings, most powerfully on 'Donda Chant' where her name is repeated in the rhythm of a heartbeat. The album grapples with West's divorce from Kim Kardashian, his faith journey, grief, and the question of whether he can live up to his mother's legacy."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Jail",
    features: ["Jay-Z"],
    duration: "4:57",
    rating: 9.5,
    description: "An arena-rock anthem featuring the long-awaited reunion of Kanye West and Jay-Z. Built on crashing guitar chords and a massive choir, both rappers reflect on their legacy and their complicated brotherhood.",
    whyStar: "The Jay-Z reunion alone makes this legendary. After years of public tension, hearing Hov rap 'God in my cell, that's my cellmate' over stadium-sized guitars was a defining moment of 2021. The production by West himself is cinematic—layering distorted guitars, choir vocals, and booming drums into something that screams arena tour. The listening party debut, with a blacked-out West standing alone, is burned into collective memory.",
    legacy: "Restored the Jay-Z and Kanye relationship publicly. The track became a staple of the Donda rollout listening events. The alternate 'Jail pt 2' with DaBaby stirred even more controversy."
  },
  {
    title: "Off the Grid",
    features: ["Playboi Carti", "Fivio Foreign"],
    duration: "5:39",
    rating: 10,
    description: "A relentless drill anthem featuring Fivio Foreign delivering the verse of his career over a menacing UK/NY drill beat. Playboi Carti adds his signature ad-libs and Kanye closes with a surprisingly capable drill verse.",
    whyStar: "Fivio Foreign's verse is universally considered one of the best rap verses of 2021—a breathless, aggressive, technically brilliant showcase that elevated his entire career. The beat by Ojivolta is a masterclass in drill production. But the real surprise is Kanye's verse—at 44 years old, he proved he could still rap with the best of them. The song brought together three generations of hip-hop on one track.",
    legacy: "Launched Fivio Foreign into mainstream stardom. Proved Kanye's relevance in the drill era. Became the most streamed track on the album and is considered one of the best drill songs ever made."
  },
  {
    title: "Come to Life",
    features: [],
    duration: "5:10",
    rating: 10,
    description: "A breathtaking, piano-driven ballad where West sings and raps about losing everything and finding the will to continue. The production builds from a single piano into a full orchestral crescendo with choir harmonies.",
    whyStar: "This is the emotional core of the entire album. West's vocal performance is raw and imperfect, which makes it devastatingly honest. The piano melody is haunting. The way the production swells into a massive climax mirrors the journey from despair to hope. During the third listening event, West literally set himself on fire as this song played—then emerged unharmed, symbolizing rebirth through faith.",
    legacy: "Universally praised as the album's best track and one of the best songs West has ever created. The listening event performance became one of the most iconic live music moments of the decade."
  }
];

const tracks: Track[] = [
  { number: 1, title: "Donda Chant", features: [], duration: "0:53", description: "Donda West's name repeated rhythmically, mimicking a heartbeat. A visceral, haunting opener.", theme: "Memory & Heartbeat", rating: 7.5 },
  { number: 2, title: "Jail", features: ["Jay-Z"], duration: "4:57", description: "An arena-rock anthem reuniting West and Jay-Z. Crashing guitars and massive choir.", theme: "Brotherhood & Redemption", rating: 9.5 },
  { number: 3, title: "God Breathed", features: ["Vory"], duration: "5:33", description: "A dark, pulsing industrial track with Vory's ethereal vocals floating over ominous production.", theme: "Divinity & Darkness", rating: 7.5 },
  { number: 4, title: "Off the Grid", features: ["Playboi Carti", "Fivio Foreign"], duration: "5:39", description: "A relentless drill anthem. Fivio Foreign delivers the verse of his career.", theme: "Dominance & Drill", rating: 10 },
  { number: 5, title: "Hurricane", features: ["The Weeknd", "Lil Baby"], duration: "4:03", description: "A soaring anthem with The Weeknd's pristine chorus. Evolved through multiple iterations over 3 years.", theme: "Faith & Survival", rating: 9.0 },
  { number: 6, title: "Praise God", features: ["Travis Scott", "Baby Keem"], duration: "3:27", description: "Baby Keem's breakout moment. A menacing, gospel-trap hybrid with a devastating beat switch.", theme: "Worship & Aggression", rating: 8.5 },
  { number: 7, title: "Jonah", features: ["Lil Durk", "Vory"], duration: "4:00", description: "A reflective track with Lil Durk's melodic vocals. Biblical imagery meets street pain.", theme: "Struggle & Deliverance", rating: 7.5 },
  { number: 8, title: "Ok Ok", features: ["Fivio Foreign", "Lil Yachty"], duration: "3:34", description: "Another drill-influenced track with bouncy energy. Light and fun by Donda standards.", theme: "Confidence & Fun", rating: 7.0 },
  { number: 9, title: "Junya", features: ["Playboi Carti"], duration: "2:36", description: "A chaotic, high-energy Carti collaboration named after designer Junya Watanabe. Minimal and explosive.", theme: "Fashion & Energy", rating: 7.5 },
  { number: 10, title: "Believe What I Say", features: [], duration: "3:51", description: "A sunny, Lauryn Hill-sampling track that sounds like classic Kanye. Joyful and nostalgic.", theme: "Joy & Nostalgia", rating: 9.0 },
  { number: 11, title: "24", features: [], duration: "3:26", description: "A spiritual, choir-driven meditation. Minimal instrumentation with the Sunday Service Choir providing warmth.", theme: "Devotion & Peace", rating: 8.0 },
  { number: 12, title: "Remote Control", features: ["Young Thug"], duration: "3:48", description: "A spacey, futuristic track with Young Thug's signature wail. Glitchy and atmospheric.", theme: "Control & Technology", rating: 7.0 },
  { number: 13, title: "Moon", features: ["Kid Cudi", "Don Toliver"], duration: "2:36", description: "Kid Cudi's ethereal humming over a minimalist beat. Dreamy and beautiful in its simplicity.", theme: "Longing & Dreaming", rating: 8.5 },
  { number: 14, title: "Heaven and Hell", features: [], duration: "2:44", description: "A heavy, dramatic track with massive organ chords and a pounding beat. Binary morality.", theme: "Judgment & Choices", rating: 8.0 },
  { number: 15, title: "Donda", features: ["Ariana Grande", "The Pusha T"], duration: "3:19", description: "Features a recording of Donda West singing. An emotional centerpiece dedicated to his mother.", theme: "Mother & Legacy", rating: 8.5 },
  { number: 16, title: "Keep My Spirit Alive", features: ["Westside Gunn", "Conway the Machine"], duration: "4:30", description: "Griselda rappers deliver hard bars over a soulful, choir-backed beat. East coast meets gospel.", theme: "Perseverance & Spirit", rating: 8.0 },
  { number: 17, title: "Jesus Lord", features: ["Jay Electronica"], duration: "8:56", description: "An 8-minute epic with Jay Electronica. Deep, reflective bars about faith, loss, and the criminal justice system.", theme: "Faith & Justice", rating: 9.0 },
  { number: 18, title: "New Again", features: ["Chris Brown"], duration: "3:05", description: "A polished pop-gospel track about renewal and starting fresh. Chris Brown's vocals add smoothness.", theme: "Renewal & Grace", rating: 7.5 },
  { number: 19, title: "Tell the Vision", features: ["Pop Smoke"], duration: "1:44", description: "A posthumous Pop Smoke feature. Minimal and unfinished, it serves as a tribute to the late rapper.", theme: "Tribute & Vision", rating: 5.5 },
  { number: 20, title: "Lord I Need You", features: [], duration: "2:42", description: "A tender, vulnerable prayer about needing divine guidance through divorce and loss.", theme: "Prayer & Vulnerability", rating: 8.5 },
  { number: 21, title: "Pure Souls", features: ["Roddy Ricch"], duration: "4:46", description: "Roddy Ricch delivers a standout chorus over uplifting production. Optimistic and forward-looking.", theme: "Purity & Hope", rating: 8.0 },
  { number: 22, title: "Come to Life", features: [], duration: "5:10", description: "A breathtaking piano-driven ballad. West sings about losing everything and finding the will to continue.", theme: "Rebirth & Transcendence", rating: 10 },
  { number: 23, title: "No Child Left Behind", features: ["Vory"], duration: "3:44", description: "The album closer. A spacious, organ-heavy track that fades into silence as Vory's vocals ascend.", theme: "Legacy & Responsibility", rating: 8.0 },
  { number: 24, title: "Jail pt 2", features: ["DaBaby", "Marilyn Manson"], duration: "5:14", description: "An alternate version of Jail with DaBaby replacing Jay-Z. Controversial due to Marilyn Manson's involvement.", theme: "Controversy & Rebellion", rating: 7.0 },
  { number: 25, title: "Ok Ok pt 2", features: ["Shenseea"], duration: "3:31", description: "A dancehall-influenced remix featuring Jamaican artist Shenseea adding tropical flavor.", theme: "Fun & Remix", rating: 7.0 },
  { number: 26, title: "Junya pt 2", features: ["Playboi Carti"], duration: "2:42", description: "An extended version with more Carti ad-libs and slightly altered production.", theme: "Fashion & Energy", rating: 7.0 },
  { number: 27, title: "Jesus Lord pt 2", features: ["Jay Electronica", "The LOX"], duration: "11:22", description: "An extended 11-minute version with additional verses from The LOX and a spoken testimony.", theme: "Epic Faith", rating: 8.5 }
];

const toggleTrack = (trackNum: number) => {
  expandedTrack.value = expandedTrack.value === trackNum ? null : trackNum;
};

const toggleStar = (index: number) => {
  expandedStar.value = expandedStar.value === index ? null : index;
};

const formatRating = (rating: number) => rating.toFixed(1);
</script>

<template>
  <div class="lr-container">
    <BackButton />
    <div class="lr-bg-overlay"></div>

    <main class="lr-content">
      <header class="lr-header">
        <div class="lr-badge">GOOD Music / Def Jam • 2021</div>
        <h1 class="lr-title">DONDA</h1>
        <p class="lr-subtitle">In Loving Memory • 27 Tracks • 108 Minutes</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/5CnpZV3q5BcESefcB3WJmz?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "I'm just the vessel. God, the electrician. I just connect the light."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">6.0</span>
            <span class="source">Pitchfork • General Review</span>
            <p>"Sprawling, uneven, but containing moments of genuine brilliance."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title star-title">◼ Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">◼</span>
                <div class="track-info">
                  <span class="track-title">{{ star.title }}</span>
                  <span v-if="star.features.length" class="track-feat">ft. {{ star.features.join(', ') }}</span>
                </div>
                <span class="track-rating">{{ formatRating(star.rating) }}</span>
              </div>
              <div class="lr-star-details" v-if="expandedStar === index">
                <p class="star-desc">{{ star.description }}</p>
                <div class="star-why">
                  <h4>Why It's a Star Track</h4>
                  <p>{{ star.whyStar }}</p>
                </div>
                <div class="star-legacy">
                  <h4>Legacy</h4>
                  <p>{{ star.legacy }}</p>
                </div>
              </div>
            </li>
          </ul>

          <h2 class="lr-section-title">Full Tracklist</h2>
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
                <span class="track-rating">{{ formatRating(track.rating) }}</span>
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
.lr-container {
  --lr-primary: #000000;
  --lr-primary-light: #1a1a1a;
  --lr-accent: #ffffff;
  --lr-accent-dim: #888888;
  --lr-cream: #ffffff;
  --lr-text-muted: #666666;
  --lr-glass: rgba(255, 255, 255, 0.04);

  background-color: var(--lr-primary);
  color: var(--lr-cream);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #000000;
  opacity: 1;
  z-index: 0;
}

.lr-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

.lr-title {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: 12px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  color: var(--lr-cream);
}

.lr-subtitle {
  font-size: 1rem;
  color: var(--lr-text-muted);
  letter-spacing: 6px;
  text-transform: uppercase;
  font-weight: 300;
}

.lr-badge {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--lr-text-muted);
  color: var(--lr-text-muted);
  padding: 0.25rem 0.75rem;
  font-weight: 500;
  font-size: 0.75rem;
  border-radius: 0px;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: none;
  border-radius: 0px;
  background: #000;
  border: 1px solid var(--lr-primary-light);
}

.lr-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
}

@media (min-width: 768px) {
  .lr-grid { grid-template-columns: 1fr 1.5fr; }
}

.lr-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--lr-primary-light);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Helvetica Neue', sans-serif;
  font-weight: 400;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.lr-tab-btn.active {
  color: var(--lr-cream);
  border-bottom: 1px solid var(--lr-cream);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(5px);
  padding: 2rem;
  border-radius: 0px;
  border: 1px solid var(--lr-primary-light);
}

.lr-card-title {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 3px;
}

.lr-card-text { line-height: 1.8; color: #aaaaaa; font-weight: 300; }

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid var(--lr-text-muted);
  font-style: italic;
  font-size: 1.1rem;
  color: var(--lr-text-muted);
  font-weight: 300;
}

.lr-review-badge {
  margin-top: 2rem;
  background: transparent;
  padding: 1rem;
  border-radius: 0px;
  text-align: center;
  border: 1px solid var(--lr-primary-light);
}

.score {
  display: block;
  font-size: 3rem;
  font-weight: 100;
  color: var(--lr-cream);
  font-family: 'Helvetica Neue', sans-serif;
  letter-spacing: 4px;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: var(--lr-text-muted);
  font-weight: 300;
}

.star-title { color: var(--lr-cream) !important; }

.lr-starlist { list-style: none; padding: 0; margin-bottom: 3rem; }

.lr-star-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.3);
}

.lr-star-header { display: flex; align-items: center; gap: 0.75rem; }
.star-icon { color: var(--lr-cream); font-size: 1rem; }

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: #cccccc; line-height: 1.6; margin-bottom: 1rem; font-weight: 300; }

.star-why, .star-legacy {
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-radius: 0px;
  margin-bottom: 0.75rem;
  border-left: 2px solid var(--lr-accent-dim);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-cream);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 0.5rem;
  font-weight: 400;
}

.star-why p, .star-legacy p { color: #aaaaaa; line-height: 1.6; font-size: 0.95rem; font-weight: 300; }

.lr-section-title {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  font-weight: 300;
  letter-spacing: 4px;
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(255, 255, 255, 0.03);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Helvetica Neue', sans-serif;
  color: var(--lr-accent-dim);
  font-size: 1.2rem;
  font-weight: 200;
  width: 40px;
}

.track-info { flex-grow: 1; display: flex; flex-direction: column; }
.track-title { font-weight: 400; font-size: 1.1rem; color: var(--lr-cream); text-transform: uppercase; letter-spacing: 1px; }
.track-feat { font-size: 0.85rem; color: var(--lr-text-muted); font-style: italic; }

.track-rating {
  color: var(--lr-cream);
  font-weight: 300;
  font-size: 0.95rem;
  min-width: 35px;
  text-align: right;
  margin-right: 1rem;
}

.track-dur { font-family: monospace; color: var(--lr-text-muted); }

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0px;
  border-left: 2px solid var(--lr-accent-dim);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-accent-dim);
  margin-bottom: 0.5rem;
  letter-spacing: 3px;
  font-weight: 400;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>