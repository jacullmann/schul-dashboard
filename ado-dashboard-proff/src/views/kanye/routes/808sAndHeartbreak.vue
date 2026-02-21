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
    title: 'The Heartbreak',
    content: "Released on November 24, 2008, '808s & Heartbreak' was born from unimaginable loss. West's mother Donda died from complications following cosmetic surgery in November 2007, and his engagement to Alexis Phifer dissolved shortly after. Shattered, West abandoned rap entirely and created an album sung almost entirely through Auto-Tune—a decision that was mocked at release but would reshape the entire genre."
  },
  {
    id: 'making',
    title: 'The Machine',
    content: "Named after the Roland TR-808 drum machine, the album was built on cold, booming electronic beats and stark synthesizers. West worked with producers Jeff Bhasker, Plain Pat, and No I.D. to strip away the warm soul samples of his previous work. The result is intentionally frigid—the sonic equivalent of emotional numbness. Each song was sung, not rapped, through heavy Auto-Tune processing."
  },
  {
    id: 'themes',
    title: 'The Influence',
    content: "808s dealt with grief ('Coldest Winter'), heartbreak ('Heartless'), isolation ('Street Lights'), and emotional fragility ('Bad News'). It was initially divisive, but its influence proved seismic. Without 808s, there is no Drake, no Kid Cudi, no Travis Scott, no Post Malone, no Juice WRLD. It single-handedly created the blueprint for emotional, melodic rap that would dominate the 2010s."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Heartless",
    features: [],
    duration: "3:31",
    rating: 9.5,
    description: "A pulsating synth-pop anthem about a cold ex-lover. Built on icy arpeggiated synthesizers and booming 808 kicks, West's Auto-Tuned vocals soar with genuine pain disguised as anger.",
    whyStar: "This was the track that proved West's gamble could work commercially. It peaked at #1 on the US Hot 100 and became one of the best-selling singles of 2008. The Hype Williams-directed animated music video became iconic. It transformed Auto-Tune from a gimmick into a legitimate artistic tool for expressing raw emotion.",
    legacy: "Became the template for every melodic rap hit that followed. Drake has explicitly cited this song as a foundational influence on his entire career."
  },
  {
    title: "Love Lockdown",
    features: [],
    duration: "4:30",
    rating: 9.5,
    description: "A minimalist masterpiece. Tribal drums, church-like vocal chants, and an almost total absence of melody create a cavernous, ceremonial atmosphere. West's vocals are haunting and desperate.",
    whyStar: "The VMA debut performance of this song—where West sang alone on a dark stage with just a drum machine—was a defining pop culture moment. The production is shockingly sparse: just drums, bass, and voice. It demonstrated that restraint could be more powerful than maximalism, a radical idea for hip-hop at the time.",
    legacy: "Pioneered the minimalist electronic approach in hip-hop. Its tribal 808 pattern became one of the most imitated drum patterns in modern music."
  },
  {
    title: "Street Lights",
    features: [],
    duration: "3:22",
    rating: 9.0,
    description: "The emotional centerpiece. Over a melancholic string-driven beat, West sings about the passage of time and the loneliness of experiencing life from behind a car window, watching streetlights pass.",
    whyStar: "This is the most lyrically profound track on the album. It captures a very specific feeling—being driven through a city at night, watching lights blur past, feeling completely disconnected from reality. The production by Jeff Bhasker uses a swelling, cinematic arrangement that evokes pure melancholy. It's West at his most openly vulnerable.",
    legacy: "Considered a deep cut classic and a fan favorite. It exemplifies the album's philosophy: beauty through simplicity and sadness."
  }
];

const tracks: Track[] = [
  { number: 1, title: "Say You Will", features: [], duration: "6:17", description: "A sprawling opener with a glacial synth pad and West pleading over 808 drums. The extended outro drifts into ambient territory.", theme: "Loss & Pleading", rating: 8.5 },
  { number: 2, title: "Welcome to Heartbreak", features: ["Kid Cudi"], duration: "4:24", description: "A glitchy, distorted lament about the emptiness of success. Features Kid Cudi's first major collaboration with West.", theme: "Emptiness & Fame", rating: 9.0 },
  { number: 3, title: "Heartless", features: [], duration: "3:31", description: "A pulsating synth-pop anthem about a cold ex-lover, driven by icy arpeggiated synths and booming 808 kicks.", theme: "Anger & Betrayal", rating: 9.5 },
  { number: 4, title: "Amazing", features: ["Young Jeezy"], duration: "4:27", description: "An arena-sized anthem featuring Young Jeezy. The beat hits like a wall, with massive, distorted 808s.", theme: "Triumph Through Pain", rating: 8.0 },
  { number: 5, title: "Love Lockdown", features: [], duration: "4:30", description: "A minimalist masterpiece with tribal drums, church-like chants, and an almost total absence of melody.", theme: "Devotion & Control", rating: 9.5 },
  { number: 6, title: "Paranoid", features: ["Mr Hudson"], duration: "4:35", description: "The most 'pop' moment. A bright, danceable new-wave influenced track about trust issues, featuring Mr Hudson.", theme: "Suspicion & Dance", rating: 8.0 },
  { number: 7, title: "RoboCop", features: [], duration: "4:40", description: "A playful, almost whimsical track about an overbearing girlfriend. Features real orchestral strings swelling into the chorus.", theme: "Obsession & Humor", rating: 7.5 },
  { number: 8, title: "Street Lights", features: [], duration: "3:22", description: "The emotional centerpiece. A melancholic, string-driven song about time passing and loneliness viewed through a car window.", theme: "Isolation & Time", rating: 9.0 },
  { number: 9, title: "Bad News", features: [], duration: "3:58", description: "The album's most emotionally raw moment. The production is sparse and clinical, mirroring the shock of receiving devastating news.", theme: "Grief & Shock", rating: 8.0 },
  { number: 10, title: "See You in My Nightmares", features: ["Lil Wayne"], duration: "4:08", description: "A haunted collaboration with Lil Wayne. Both artists' Auto-Tuned voices blur together in a dark, nightmarish landscape.", theme: "Haunting & Revenge", rating: 7.5 },
  { number: 11, title: "Coldest Winter", features: [], duration: "3:33", description: "A direct eulogy for Donda West. Sampling Tears for Fears' 'Memories Fade,' it is devastating in its simplicity.", theme: "Grief & Remembrance", rating: 9.0 },
  { number: 12, title: "Pinocchio Story (Freestyle Live)", features: [], duration: "6:01", description: "A live freestyle recorded at a concert, capturing West's stream of consciousness about wanting to be 'a real boy'—a human, not a celebrity.", theme: "Authenticity & Fame", rating: 7.0 }
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
        <div class="lr-badge">Roc-A-Fella / Def Jam • 2008</div>
        <h1 class="lr-title">808s & <span class="text-accent">Heartbreak</span></h1>
        <p class="lr-subtitle">The Album That Changed Everything</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/3WFTGIO6E3Xh4paEOBY9ad?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "I'm not rapping on this album. This is pop art."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">7.6</span>
            <span class="source">Pitchfork • Retrospective Score</span>
            <p>"Cold, clinical, and ultimately prophetic."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title star-title">♡ Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">♡</span>
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
  --lr-primary: #a8a8a8;
  --lr-dark: #1a1a2e;
  --lr-accent: #e74c6f;
  --lr-accent-dim: #c0394f;
  --lr-cream: #f0eef2;
  --lr-text-muted: #9b98a8;
  --lr-glass: rgba(20, 20, 40, 0.7);

  background-color: var(--lr-dark);
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
  background: linear-gradient(180deg, #16213e 0%, #0f0f23 50%, #1a1a2e 100%);
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
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 3.5rem;
  font-weight: 200;
  letter-spacing: 4px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.text-accent { color: var(--lr-accent); font-weight: 200; }

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 6px;
  text-transform: uppercase;
  font-weight: 200;
}

.lr-badge {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--lr-accent);
  color: var(--lr-accent);
  padding: 0.25rem 0.75rem;
  font-weight: 500;
  font-size: 0.75rem;
  border-radius: 99px;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 60px rgba(231, 76, 111, 0.15);
  border-radius: 12px;
  background: #000;
  border: 1px solid rgba(231, 76, 111, 0.3);
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
  border-bottom: 1px solid rgba(231, 76, 111, 0.2);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Helvetica Neue', sans-serif;
  font-weight: 300;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.lr-tab-btn.active {
  color: var(--lr-accent);
  border-bottom: 1px solid var(--lr-accent);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid rgba(231, 76, 111, 0.15);
}

.lr-card-title {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-cream);
  font-weight: 200;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.lr-card-text { line-height: 1.8; color: #c8c4d0; font-weight: 300; }

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid var(--lr-accent);
  font-style: italic;
  font-size: 1.2rem;
  color: var(--lr-accent);
  font-weight: 300;
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(231, 76, 111, 0.2);
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 200;
  color: var(--lr-accent);
  font-family: 'Helvetica Neue', sans-serif;
  letter-spacing: 2px;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--lr-text-muted);
  font-weight: 300;
}

.star-title { color: var(--lr-accent) !important; }

.lr-starlist { list-style: none; padding: 0; margin-bottom: 3rem; }

.lr-star-item {
  background: rgba(231, 76, 111, 0.08);
  border: 1px solid rgba(231, 76, 111, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(231, 76, 111, 0.15);
  border-color: var(--lr-accent);
}

.lr-star-header { display: flex; align-items: center; gap: 0.75rem; }
.star-icon { color: var(--lr-accent); font-size: 1.4rem; }

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(231, 76, 111, 0.15);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: var(--lr-cream); line-height: 1.6; margin-bottom: 1rem; }

.star-why, .star-legacy {
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  border-left: 2px solid var(--lr-accent);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-accent);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.5rem;
  font-weight: 400;
}

.star-why p, .star-legacy p { color: #c8c4d0; line-height: 1.6; font-size: 0.95rem; }

.lr-section-title {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
  font-weight: 200;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(231, 76, 111, 0.08);
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
.track-title { font-weight: 400; font-size: 1.1rem; color: var(--lr-cream); }
.track-feat { font-size: 0.85rem; color: var(--lr-text-muted); font-style: italic; }

.track-rating {
  color: var(--lr-accent);
  font-weight: 500;
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
  border-radius: 6px;
  border-left: 2px solid var(--lr-accent);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-accent);
  margin-bottom: 0.5rem;
  letter-spacing: 2px;
  font-weight: 500;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>