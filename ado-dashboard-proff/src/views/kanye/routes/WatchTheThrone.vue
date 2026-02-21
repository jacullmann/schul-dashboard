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
    title: 'The Summit',
    content: "Released on August 8, 2011, 'Watch the Throne' was the ultimate hip-hop power move. Two titans—Jay-Z and Kanye West—joined forces for a collaborative album that redefined luxury rap. It debuted at #1 on the Billboard 200 with 436,000 copies sold in its first week. The album was announced and released as a digital-only exclusive on Tidal before seeing a physical release, pioneering the surprise-drop model."
  },
  {
    id: 'making',
    title: 'The Opulence',
    content: "Recorded across the globe—in hotels in Paris, London, Abu Dhabi, and New York—the album was produced with zero budget constraints. West recruited producers like Hit-Boy, The Neptunes, RZA, Swizz Beatz, and Q-Tip. The packaging was designed by Riccardo Tisci of Givenchy, featuring real gold foil embossing. The sonic palette blends soul samples, trap drums, and operatic vocal chops into a sound dripping with opulence."
  },
  {
    id: 'themes',
    title: 'The Crown',
    content: "The album explores Black excellence and wealth in America—the joy of success ('Otis'), the paranoia that comes with it ('Murder to Excellence'), and the sheer power of two Black men at the absolute peak of culture ('Ni**as in Paris'). It also addresses racial inequality, the African diaspora, and the responsibility that comes with influence. It's a victory lap that never forgets where it came from."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Ni**as in Paris",
    features: [],
    duration: "3:39",
    rating: 10,
    description: "An explosive trap-influenced banger built on a stuttering synth riff and booming 808s. Features the iconic 'Ball so hard' hook and a beat that practically invented the concept of the 'drop' in hip-hop.",
    whyStar: "This became one of the biggest hip-hop songs of the decade. On the Watch the Throne Tour, Jay-Z and Kanye performed it up to 12 times in a single show in Paris. The energy was so unprecedented that it became its own cultural event. Hit-Boy's production—built entirely on a laptop—is now studied as a masterclass in trap-rap fusion.",
    legacy: "Won the Grammy for Best Rap Performance. The song's structure—building tension then releasing with a devastating drop—became the template for trap-rap anthems. It has been sampled and referenced thousands of times."
  },
  {
    title: "Otis",
    features: [],
    duration: "2:58",
    description: "A joyful, breathless track built on a chopped Otis Redding sample ('Try a Little Tenderness'). Both rappers trade bars over a roaring soul groove with pure ecstasy.",
    rating: 9.5,
    whyStar: "This is pure, uncut joy. The sample chop of Otis Redding is one of the most creative in hip-hop history—Kanye slices and reassembles the vocal in a way that creates an entirely new melody. The Spike Jonze-directed music video, featuring the two destroying a Maybach, is legendary. It proved that sampling could still be revolutionary.",
    legacy: "Won the Grammy for Best Rap Song. Considered one of the best sample flips ever. The Maybach from the music video was auctioned for charity."
  },
  {
    title: "No Church in the Wild",
    features: ["Frank Ocean", "The-Dream"],
    duration: "4:32",
    rating: 9.5,
    description: "A dark, philosophical opener featuring Frank Ocean's haunting chorus questioning the role of God in a chaotic world. The beat is built on tribal drums and a menacing bassline.",
    whyStar: "Frank Ocean's hook—recorded before 'Channel Orange' dropped—elevated this track into something timeless. The philosophical lyrics question faith, morality, and power in a way that feels more like literature than rap. The production by Hit-Boy and Mike Dean creates an atmosphere that is simultaneously ancient and futuristic.",
    legacy: "Won the Grammy for Best Rap/Sung Collaboration. Often cited as one of the best album openers in hip-hop history. It helped launch Frank Ocean into mainstream consciousness."
  }
];

const tracks: Track[] = [
  { number: 1, title: "No Church in the Wild", features: ["Frank Ocean", "The-Dream"], duration: "4:32", description: "A dark philosophical opener questioning faith and order. Frank Ocean's ethereal hook floats over tribal drums.", theme: "Faith & Anarchy", rating: 9.5 },
  { number: 2, title: "Lift Off", features: ["Beyoncé"], duration: "4:56", description: "A grandiose track featuring Beyoncé on the hook. Space-shuttle imagery and massive production.", theme: "Ascension & Power", rating: 7.5 },
  { number: 3, title: "Ni**as in Paris", features: [], duration: "3:39", description: "A trap-influenced banger with stuttering synths and booming 808s. The 'Ball so hard' hook is iconic.", theme: "Excess & Celebration", rating: 10 },
  { number: 4, title: "Otis", features: [], duration: "2:58", description: "Pure joy. A chopped Otis Redding sample creates a breathless, soulful celebration of success.", theme: "Joy & Brotherhood", rating: 9.5 },
  { number: 5, title: "Gotta Have It", features: [], duration: "3:36", description: "A cool, swaggering track with a laid-back beat. Both rappers trade bars about the finer things.", theme: "Luxury & Swagger", rating: 8.0 },
  { number: 6, title: "New Day", features: [], duration: "4:21", description: "Both rappers write letters to their unborn sons over a haunting Nina Simone sample. Deeply reflective.", theme: "Legacy & Fatherhood", rating: 8.5 },
  { number: 7, title: "That's My Bitch", features: [], duration: "3:51", description: "A hard-hitting celebration of their partners, sampling Apache's 'Gang Starr.' Raw and unapologetic.", theme: "Love & Devotion", rating: 7.5 },
  { number: 8, title: "Welcome to the Jungle", features: [], duration: "3:25", description: "A dark, aggressive track referencing the chaos of the entertainment industry.", theme: "Danger & Industry", rating: 7.0 },
  { number: 9, title: "Who Gon Stop Me", features: [], duration: "3:18", description: "A dubstep-influenced banger with wobbling bass. An assertion of dominance.", theme: "Dominance & Power", rating: 7.5 },
  { number: 10, title: "Murder to Excellence", features: [], duration: "5:06", description: "A two-part song: Part 1 addresses Black-on-Black violence; Part 2 celebrates Black achievement. Masterful contrast.", theme: "Violence & Achievement", rating: 9.0 },
  { number: 11, title: "Made in America", features: ["Frank Ocean"], duration: "4:07", description: "A patriotic thesis featuring Frank Ocean. It examines the American Dream through a Black lens.", theme: "Identity & Patriotism", rating: 8.0 },
  { number: 12, title: "Why I Love You", features: ["Mr Hudson"], duration: "4:11", description: "An emotional closer sampling Cassius' 'I <3 U So.' Addresses loyalty, betrayal, and the cost of friendship.", theme: "Loyalty & Betrayal", rating: 8.0 }
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
        <div class="lr-badge">Roc-A-Fella / Def Jam • 2011</div>
        <h1 class="lr-title">Watch The <span class="text-gold">Throne</span></h1>
        <p class="lr-subtitle">Jay-Z × Kanye West • The Pinnacle of Luxury Rap</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/0OcMap99vLEeGkBCfCwRwS?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "Luxury rap. The Givenchy approach to hip-hop."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">8.0</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"Two kings turning wealth into art."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title star-title">♛ Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">♛</span>
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
  --lr-primary: #0a0a0a;
  --lr-primary-light: #1a1a1a;
  --lr-gold: #d4af37;
  --lr-gold-dim: #8b7024;
  --lr-cream: #f5f0e1;
  --lr-text-muted: #a09880;
  --lr-glass: rgba(20, 18, 10, 0.8);

  background-color: var(--lr-primary);
  color: var(--lr-cream);
  font-family: 'Didot', 'Georgia', 'Times New Roman', serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse at 50% 0%, #2a2310 0%, #0a0a0a 70%);
  opacity: 0.9;
  z-index: 0;
}

.lr-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

.lr-title {
  font-family: 'Didot', 'Georgia', serif;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: 4px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.text-gold { color: var(--lr-gold); }

.lr-subtitle {
  font-size: 1.1rem;
  color: var(--lr-gold-dim);
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 400;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-gold);
  color: #0a0a0a;
  padding: 0.25rem 0.75rem;
  font-weight: 800;
  font-size: 0.75rem;
  border-radius: 0px;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 60px rgba(212, 175, 55, 0.15);
  border-radius: 0px;
  background: #000;
  border: 3px solid var(--lr-gold);
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
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Didot', 'Georgia', serif;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.lr-tab-btn.active {
  color: var(--lr-gold);
  border-bottom: 2px solid var(--lr-gold);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 0px;
  border: 1px solid rgba(212, 175, 55, 0.2);
}

.lr-card-title {
  font-family: 'Didot', 'Georgia', serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-gold);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.lr-card-text { line-height: 1.8; color: #d4cbb8; }

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
  border-radius: 0px;
  text-align: center;
  border: 1px solid var(--lr-gold-dim);
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--lr-gold);
  font-family: 'Didot', 'Georgia', serif;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--lr-text-muted);
}

.star-title { color: var(--lr-gold) !important; }

.lr-starlist { list-style: none; padding: 0; margin-bottom: 3rem; }

.lr-star-item {
  background: rgba(212, 175, 55, 0.06);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 0px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(212, 175, 55, 0.12);
  border-color: var(--lr-gold);
}

.lr-star-header { display: flex; align-items: center; gap: 0.75rem; }
.star-icon { color: var(--lr-gold); font-size: 1.4rem; }

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(212, 175, 55, 0.15);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: var(--lr-cream); line-height: 1.6; margin-bottom: 1rem; }

.star-why, .star-legacy {
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 0px;
  margin-bottom: 0.75rem;
  border-left: 3px solid var(--lr-gold);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-gold);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.5rem;
}

.star-why p, .star-legacy p { color: #d4cbb8; line-height: 1.6; font-size: 0.95rem; }

.lr-section-title {
  font-family: 'Didot', 'Georgia', serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  letter-spacing: 3px;
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(212, 175, 55, 0.08);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Didot', 'Georgia', serif;
  color: var(--lr-gold-dim);
  font-size: 1.2rem;
  width: 40px;
}

.track-info { flex-grow: 1; display: flex; flex-direction: column; }
.track-title { font-weight: 600; font-size: 1.1rem; color: var(--lr-cream); text-transform: uppercase; letter-spacing: 1px; }
.track-feat { font-size: 0.85rem; color: var(--lr-text-muted); font-style: italic; }

.track-rating {
  color: var(--lr-gold);
  font-weight: 700;
  font-size: 0.95rem;
  min-width: 35px;
  text-align: right;
  margin-right: 1rem;
}

.track-dur { font-family: monospace; color: var(--lr-text-muted); }

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 0px;
  border-left: 3px solid var(--lr-gold);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-gold);
  margin-bottom: 0.5rem;
  letter-spacing: 2px;
  font-weight: bold;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>