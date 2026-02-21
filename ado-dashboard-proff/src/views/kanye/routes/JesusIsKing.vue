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
    title: 'The Conversion',
    content: "Released on October 25, 2019, 'Jesus Is King' marked Kanye West's full pivot to gospel music. Following his spiritual awakening and the launch of his Sunday Service choir in January 2019, West committed to making an album free of profanity and entirely devoted to Christian worship. It debuted at #1 on the Billboard 200 and won the Grammy for Best Contemporary Christian Music Album."
  },
  {
    id: 'making',
    title: 'The Sessions',
    content: "The album was recorded across multiple locations including a resort in Cody, Wyoming and a studio in Atlanta. West's Sunday Service Choir—a massive, robed gospel ensemble—features prominently throughout. The production blends traditional gospel instrumentation (organ, choir, claps) with modern hip-hop elements and the signature Kanye West sonic maximalism. The album was delayed multiple times as West reworked it."
  },
  {
    id: 'themes',
    title: 'The Faith',
    content: "The album is a straightforward declaration of Christian faith—worshipful, earnest, and unapologetically religious. It addresses West's past sins ('Selah'), his new devotion ('Follow God'), and his vision of a Christ-centered life ('God Is'). Critics were divided—some saw it as genuine transformation, others as another Kanye 'phase.' Regardless, its sincerity is undeniable. At just 27 minutes, every second is focused."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Follow God",
    features: [],
    duration: "1:45",
    rating: 9.0,
    description: "The album's most accessible track. A hard-hitting, sample-driven banger where West raps about trying to follow God's path while dealing with family tensions. Built on a Whole Truth sample chopped to perfection.",
    whyStar: "In just 1:45, this track accomplishes what many songs can't in five minutes. The production is classic Kanye—a chopped soul sample sped up over punchy drums—proving he hadn't lost his ear. The lyrical content about arguing with his father while trying to be a godly man is deeply relatable. It was the lead single and proved that gospel rap could still hit hard.",
    legacy: "Became the album's biggest streaming hit. The music video, shot by West's daughter North West on an iPhone in Wyoming, charmed audiences with its simplicity. Proved that soulful chipmunk-style production still worked in 2019."
  },
  {
    title: "Selah",
    features: [],
    duration: "2:44",
    rating: 9.0,
    description: "A thunderous, choir-heavy anthem that feels like the opening of a spiritual battle. The title refers to the Hebrew word found in Psalms, often interpreted as a musical interlude or moment of reflection.",
    whyStar: "The production is monumental—the Sunday Service Choir's voices stack into a wall of sound that feels like being inside a cathedral. The drums hit like cannons. West's verses reference his past sins and his transformation. The line 'Everybody wanted Yandhi / Then Jesus Christ did the laundry' is a direct acknowledgment of the scrapped 'Yandhi' album. It's the most cinematic moment on the album.",
    legacy: "Showcased the Sunday Service Choir's full potential on record. The 'hallelujah' chants became a signature West moment. It demonstrated that gospel music could be produced with the same intensity and ambition as secular hip-hop."
  },
  {
    title: "Use This Gospel",
    features: ["Clipse", "Kenny G"],
    duration: "3:55",
    rating: 8.5,
    description: "A dramatic, Pusha T and No Malice (Clipse) reunion over a spacious beat that builds to a Kenny G saxophone solo. The reuniting of the Clipse—No Malice had left the group for a Christian music career—gives this track symbolic weight.",
    whyStar: "The Clipse reunion was monumental. No Malice (formerly No Malice of Clipse) had walked away from secular rap due to his faith, and Pusha T remained one of the hardest rappers alive. Reuniting them on a gospel song bridged their worlds perfectly. Kenny G's saxophone solo at the end is surprisingly moving—an unexpected choice that works beautifully. The Dr. Dre remix later became a fan favorite.",
    legacy: "Reunited Clipse for the first time in years, directly inspiring their later collaboration on future projects. The Kenny G moment became iconic and sparked a renaissance for the saxophonist."
  }
];

const tracks: Track[] = [
  { number: 1, title: "Every Hour", features: [], duration: "1:51", description: "A pure, unfiltered gospel choir performance by the Sunday Service Choir. No rap, no drums—just voices praising God.", theme: "Pure Worship", rating: 7.5 },
  { number: 2, title: "Selah", features: [], duration: "2:44", description: "A thunderous, choir-heavy anthem with cannon-like drums. References past sins and spiritual rebirth.", theme: "Spiritual Warfare", rating: 9.0 },
  { number: 3, title: "Follow God", features: [], duration: "1:45", description: "A hard-hitting, sample-driven banger about trying to follow God's path while dealing with family tensions.", theme: "Obedience & Family", rating: 9.0 },
  { number: 4, title: "Closed on Sunday", features: [], duration: "2:32", description: "A sparse, acoustic-driven track using Chick-fil-A as a metaphor for faith-based principles. Divides listeners.", theme: "Sabbath & Values", rating: 6.5 },
  { number: 5, title: "On God", features: [], duration: "2:32", description: "A Pi'erre Bourne-produced track blending trap with worship. West addresses his tax situation and business ventures through a spiritual lens.", theme: "Providence & Business", rating: 7.5 },
  { number: 6, title: "Everything We Need", features: ["Ty Dolla $ign", "Ant Clemons"], duration: "1:58", description: "A breezy, melodic track about finding contentment. Ty Dolla $ign and Ant Clemons deliver smooth harmonies.", theme: "Contentment & Grace", rating: 7.5 },
  { number: 7, title: "Water", features: ["Ant Clemons"], duration: "1:49", description: "A minimalist, aquatic-themed meditation on spiritual cleansing. The production ripples with gentle synths.", theme: "Baptism & Renewal", rating: 7.0 },
  { number: 8, title: "God Is", features: [], duration: "3:22", description: "The album's most emotionally raw moment. West sings (not raps) a testimony of his faith journey, his voice cracking with genuine emotion.", theme: "Testimony & Devotion", rating: 8.5 },
  { number: 9, title: "Hands On", features: ["Fred Hammond"], duration: "3:17", description: "A critique of how the Christian community initially rejected West's conversion. Features Fred Hammond's gospel vocals.", theme: "Judgment & Acceptance", rating: 8.0 },
  { number: 10, title: "Use This Gospel", features: ["Clipse", "Kenny G"], duration: "3:55", description: "A dramatic track reuniting Clipse (Pusha T + No Malice) with a climactic Kenny G saxophone solo.", theme: "Redemption & Brotherhood", rating: 8.5 },
  { number: 11, title: "Jesus Is Lord", features: [], duration: "0:49", description: "A brief, declarative closer. The Sunday Service Choir delivers a final statement of faith in under a minute.", theme: "Declaration", rating: 7.0 }
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
        <div class="lr-badge">GOOD Music / Def Jam • 2019</div>
        <h1 class="lr-title">Jesus Is <span class="text-accent">King</span></h1>
        <p class="lr-subtitle">Sunday Service • A Gospel Testament</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/0FgMkjnGvWVBaJbk3v4LBa?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "Now that I'm in service to Christ, my job is to spread the gospel."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">6.0</span>
            <span class="source">Pitchfork • General Review</span>
            <p>"Sincere but restrained. A work of genuine faith."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title star-title">✟ Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">✟</span>
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
  --lr-primary: #e8dcc8;
  --lr-dark: #1a1410;
  --lr-accent: #c49a3c;
  --lr-accent-dim: #8b6914;
  --lr-blue: #4a90d9;
  --lr-cream: #1a1410;
  --lr-text-muted: #6b5d4f;
  --lr-glass: rgba(232, 220, 200, 0.8);

  background-color: var(--lr-primary);
  color: var(--lr-cream);
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #d4c4a8 0%, #e8dcc8 30%, #f0e8d8 100%);
  opacity: 0.6;
  z-index: 0;
}

.lr-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

.lr-title {
  font-family: 'Palatino Linotype', serif;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.text-accent { color: var(--lr-accent); }

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 400;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-accent);
  color: #fff;
  padding: 0.25rem 0.75rem;
  font-weight: 700;
  font-size: 0.75rem;
  border-radius: 2px;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  border-radius: 12px;
  background: #000;
  border: 3px solid var(--lr-accent);
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
  border-bottom: 1px solid rgba(196, 154, 60, 0.3);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Palatino Linotype', serif;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
}

.lr-tab-btn.active {
  color: var(--lr-accent);
  border-bottom: 2px solid var(--lr-accent);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid rgba(196, 154, 60, 0.3);
}

.lr-card-title {
  font-family: 'Palatino Linotype', serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-accent-dim);
}

.lr-card-text { line-height: 1.8; color: #3a3025; }

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--lr-accent);
  font-style: italic;
  font-family: 'Palatino Linotype', serif;
  font-size: 1.2rem;
  color: var(--lr-accent-dim);
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(26, 20, 16, 0.08);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(196, 154, 60, 0.3);
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--lr-accent);
  font-family: 'Palatino Linotype', serif;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--lr-text-muted);
}

.star-title { color: var(--lr-accent) !important; }

.lr-starlist { list-style: none; padding: 0; margin-bottom: 3rem; }

.lr-star-item {
  background: rgba(196, 154, 60, 0.08);
  border: 1px solid rgba(196, 154, 60, 0.25);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(196, 154, 60, 0.15);
  border-color: var(--lr-accent);
}

.lr-star-header { display: flex; align-items: center; gap: 0.75rem; }
.star-icon { color: var(--lr-accent); font-size: 1.4rem; }

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(196, 154, 60, 0.2);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: var(--lr-cream); line-height: 1.6; margin-bottom: 1rem; }

.star-why, .star-legacy {
  background: rgba(196, 154, 60, 0.06);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  border-left: 3px solid var(--lr-accent);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-accent-dim);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.star-why p, .star-legacy p { color: #3a3025; line-height: 1.6; font-size: 0.95rem; }

.lr-section-title {
  font-family: 'Palatino Linotype', serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(0,0,0,0.08);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(196, 154, 60, 0.08);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lr-track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-num {
  font-family: 'Palatino Linotype', serif;
  color: var(--lr-accent);
  font-size: 1.2rem;
  width: 40px;
}

.track-info { flex-grow: 1; display: flex; flex-direction: column; }
.track-title { font-weight: 600; font-size: 1.1rem; color: var(--lr-cream); }
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
  background: rgba(196, 154, 60, 0.06);
  border-radius: 6px;
  border-left: 3px solid var(--lr-accent);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-accent-dim);
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
  font-weight: bold;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>