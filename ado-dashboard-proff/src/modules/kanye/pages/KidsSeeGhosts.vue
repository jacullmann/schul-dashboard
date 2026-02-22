<script setup lang="ts">
import { ref } from 'vue';
import BackButton from "@/modules/kanye/components/BackButton.vue";

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
    title: 'The Vision',
    content: "Released on June 8, 2018, 'KIDS SEE GHOSTS' is a collaborative album between Kanye West and Kid Cudi. Part of the Wyoming Sessions alongside 'ye,' 'Daytona,' and 'Nasir,' it was released just one week after 'ye.' Despite its brief 23-minute runtime, it is widely considered the best project to come out of those sessions and one of the best albums of 2018."
  },
  {
    id: 'making',
    title: 'The Brotherhood',
    content: "The collaboration was deeply personal. Kid Cudi had publicly struggled with depression, anxiety, and suicidal thoughts, entering rehab in 2016. West had been hospitalized for a mental breakdown that same year. Their friendship, which had been strained, was rebuilt through the creative process. The album was produced primarily by Kanye West alongside producers like Plain Pat, Andrew Dawson, and Dot da Genius."
  },
  {
    id: 'themes',
    title: 'The Healing',
    content: "The album is a journey from darkness to light. It opens in a place of emotional turmoil ('Feel the Love') and gradually moves toward hope and rebirth ('Reborn,' 'Cudi Montage'). Themes of mental health, spirituality, and friendship are woven throughout. The Takashi Murakami cover art—a psychedelic mountain scene with ghosts—visually captures the album's blend of darkness and beauty."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Reborn",
    features: [],
    duration: "5:12",
    rating: 10,
    description: "An anthemic track about overcoming personal demons and rediscovering the will to keep going. Kid Cudi's signature humming meets a triumphant synth progression that builds to a euphoric climax.",
    whyStar: "This is the emotional heart of the album and arguably the greatest song about mental health recovery in hip-hop. Kid Cudi's hook—'I'm so, I'm so reborn'—became an anthem for anyone who has struggled with depression. The production evolves from subdued to massive over five minutes, mirroring the journey from breakdown to breakthrough. It's catharsis in song form.",
    legacy: "Became the defining anthem of the Wyoming Sessions. It's frequently cited by fans as a song that genuinely helped them through difficult times. The live performances of this track during the 'Kids See Ghosts' tour were legendary."
  },
  {
    title: "4th Dimension",
    features: ["Louis Prima"],
    duration: "2:34",
    rating: 9.5,
    description: "A frenetic, sample-heavy banger built on a sped-up 1936 Louis Prima Christmas record. The production is bouncy and chaotic, with West and Cudi trading aggressive bars.",
    whyStar: "The sample flip is insane. Taking a 1936 Christmas song and turning it into a hard-hitting hip-hop track is pure Kanye genius. The energy is relentless—the beat feels like it's about to fly apart at the seams but never does. It's the most replay-worthy track on the album, packed into a lean 2:34. The way it references cosmic themes while sounding like a party is the KSG magic.",
    legacy: "Spawned thousands of 'how did he sample THAT?' reactions. It showcased that Kanye's sample-chopping abilities remained unmatched and introduced a new generation to Louis Prima."
  },
  {
    title: "Kids See Ghosts",
    features: ["Yasiin Bey"],
    duration: "3:52",
    rating: 9.5,
    description: "The title track features a heavenly hook, a verse from Yasiin Bey (Mos Def), and a Kurt Cobain vocal sample. It floats between psychedelic rock and atmospheric hip-hop.",
    whyStar: "The merging of Kurt Cobain's vocals with Kid Cudi and Kanye is symbolic—three artists defined by their emotional rawness and struggles with mental health. Yasiin Bey's surprise verse added a soulful, grounding presence. The production is lush and dreamy, creating the album's most transportive moment. It perfectly embodies the album's theme of seeing beauty in darkness.",
    legacy: "The Kurt Cobain sample became one of the most discussed creative decisions in 2018. It cemented the album's status as a genre-blending masterpiece and created renewed interest in Cobain's lesser-known recordings."
  }
];

const tracks: Track[] = [
  { number: 1, title: "Feel the Love", features: ["Pusha T"], duration: "2:34", description: "An explosive opener where Kanye abandons rapping entirely, opting for primal gunshot ad-libs ('GRRAT!') over a hard-hitting trap beat. Pusha T delivers a sharp verse.", theme: "Raw Energy", rating: 8.5 },
  { number: 2, title: "Fire", features: [], duration: "2:54", description: "A guitar-driven psychedelic rock-rap fusion. Both artists rap about rising from the ashes. The production blends indie rock with heavy 808s.", theme: "Rebirth & Fire", rating: 8.5 },
  { number: 3, title: "4th Dimension", features: ["Louis Prima"], duration: "2:34", description: "A frenetic banger built on a sped-up 1936 Louis Prima Christmas record. The chopped sample creates a manic, jubilant energy.", theme: "Cosmic Energy", rating: 9.5 },
  { number: 4, title: "Freeee (Ghost Town Pt. 2)", features: ["Ty Dolla $ign"], duration: "3:25", description: "A spiritual sequel to 'ye's 'Ghost Town.' A liberation anthem about breaking free from mental chains. Ty Dolla $ign's soulful vocals soar.", theme: "Freedom & Liberation", rating: 8.5 },
  { number: 5, title: "Reborn", features: [], duration: "5:12", description: "An anthemic track about overcoming personal demons. Kid Cudi's signature humming meets a triumphant synth progression.", theme: "Recovery & Hope", rating: 10 },
  { number: 6, title: "Kids See Ghosts", features: ["Yasiin Bey"], duration: "3:52", description: "The floating title track with a Kurt Cobain vocal sample and a surprise verse from Yasiin Bey. Dreamy and transcendent.", theme: "Vision & Transcendence", rating: 9.5 },
  { number: 7, title: "Cudi Montage", features: [], duration: "3:09", description: "A somber, reflective closer sampling Kurt Cobain's 'Burn the Rain.' It's a quiet, beautiful meditation on loss and resilience.", theme: "Reflection & Peace", rating: 9.0 }
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
        <div class="lr-badge">GOOD Music / Def Jam • 2018</div>
        <h1 class="lr-title">KIDS SEE <span class="text-accent">GHOSTS</span></h1>
        <p class="lr-subtitle">Kanye West × Kid Cudi • 23 Minutes of Transcendence</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/6pwuKxMUkNg673KETsXPUV?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "Two broken souls rebuilding each other through sound."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">7.6</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"Psychedelic, healing, and fearlessly creative."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title star-title">👻 Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">👻</span>
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
  --lr-primary: #1a0a2e;
  --lr-primary-light: #2d1854;
  --lr-accent: #ff6b9d;
  --lr-accent2: #c084fc;
  --lr-fire: #f97316;
  --lr-cream: #faf5ff;
  --lr-text-muted: #b8a8d0;
  --lr-glass: rgba(45, 24, 84, 0.7);

  background-color: var(--lr-primary);
  color: var(--lr-cream);
  font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #2d1854 0%, #1a0a2e 30%, #0d0519 60%, #1a0a0a 100%);
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
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  text-shadow: 2px 2px 0 var(--lr-accent);
}

.text-accent { color: var(--lr-accent); }

.lr-subtitle {
  font-size: 1.1rem;
  color: var(--lr-accent2);
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 600;
}

.lr-badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--lr-accent), var(--lr-accent2));
  color: #fff;
  padding: 0.25rem 0.75rem;
  font-weight: 800;
  font-size: 0.75rem;
  border-radius: 20px;
  margin-bottom: 1rem;
  text-transform: uppercase;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 60px rgba(255, 107, 157, 0.2);
  border-radius: 16px;
  background: #000;
  border: 3px solid transparent;
  background-clip: padding-box;
  outline: 3px solid var(--lr-accent);
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
  border-bottom: 2px solid rgba(255, 107, 157, 0.2);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Trebuchet MS', sans-serif;
  font-weight: 700;
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
  border: 1px solid rgba(255, 107, 157, 0.2);
}

.lr-card-title {
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-accent2);
  text-transform: uppercase;
  font-weight: 900;
}

.lr-card-text { line-height: 1.8; color: #e0d4f0; }

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--lr-accent);
  font-style: italic;
  font-size: 1.2rem;
  color: var(--lr-accent);
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--lr-primary-light);
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--lr-accent);
  font-family: 'Trebuchet MS', sans-serif;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--lr-text-muted);
  font-weight: bold;
}

.star-title { color: var(--lr-accent) !important; }

.lr-starlist { list-style: none; padding: 0; margin-bottom: 3rem; }

.lr-star-item {
  background: rgba(255, 107, 157, 0.08);
  border: 1px solid rgba(255, 107, 157, 0.25);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(255, 107, 157, 0.15);
  border-color: var(--lr-accent);
  box-shadow: 0 0 15px rgba(255, 107, 157, 0.1);
}

.lr-star-header { display: flex; align-items: center; gap: 0.75rem; }
.star-icon { font-size: 1.3rem; }

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 107, 157, 0.15);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: var(--lr-cream); line-height: 1.6; margin-bottom: 1rem; }

.star-why, .star-legacy {
  background: rgba(0,0,0,0.25);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border-left: 3px solid var(--lr-accent2);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-accent2);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.star-why p, .star-legacy p { color: #e0d4f0; line-height: 1.6; font-size: 0.95rem; }

.lr-section-title {
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
  text-transform: uppercase;
  font-weight: 900;
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(255, 107, 157, 0.08);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Trebuchet MS', sans-serif;
  color: var(--lr-accent2);
  font-weight: bold;
  font-size: 1.2rem;
  width: 40px;
}

.track-info { flex-grow: 1; display: flex; flex-direction: column; }
.track-title { font-weight: 700; font-size: 1.1rem; color: var(--lr-cream); text-transform: uppercase; }
.track-feat { font-size: 0.85rem; color: var(--lr-text-muted); font-style: italic; }

.track-rating {
  color: var(--lr-accent);
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
  background: rgba(45, 24, 84, 0.5);
  border-radius: 8px;
  border-left: 3px solid var(--lr-accent);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-accent2);
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
  font-weight: 800;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>