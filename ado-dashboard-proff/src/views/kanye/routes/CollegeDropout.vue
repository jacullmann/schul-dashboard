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
    title: 'The Underdog',
    content: "Released on February 10, 2004, 'The College Dropout' was the beginning of a revolution. Kanye West had been fighting for years to be taken seriously as a rapper—not just a producer. After surviving a near-fatal car accident in October 2002, he channeled his recovery into this debut, which Roc-A-Fella Records initially didn't believe in. It debuted at #2 on the Billboard 200, selling 441,000 copies in its first week, and went on to win the Grammy for Best Rap Album."
  },
  {
    id: 'making',
    title: 'The Sound',
    content: "West pioneered the 'chipmunk soul' technique—pitching up classic soul vocal samples to create bright, warm productions. Drawing from Curtis Mayfield, Chaka Khan, Luther Vandross, and Lauryn Hill, the beats were lush and soulful, a stark contrast to the dominant gangsta rap of the era. The album was recorded across multiple studios in NYC and featured a revolving door of collaborators including Jay-Z, Common, Talib Kweli, and Mos Def."
  },
  {
    id: 'themes',
    title: 'The Message',
    content: "The album is a manifesto against the traditional path. It questions the value of higher education ('We Don't Care', 'School Spirit'), explores faith and social consciousness ('Jesus Walks', 'Never Let Me Down'), and uncovers the everyday struggles of working-class Black America ('Spaceship', 'All Falls Down'). It's both deeply personal and universally resonant—a blueprint for conscious hip-hop in the mainstream."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Jesus Walks",
    features: [],
    duration: "3:13",
    rating: 10,
    description: "A thunderous, marching-band-driven anthem about faith and the music industry's reluctance to embrace religion. Built on a sample from the ARC Choir, the beat layers stomping percussion with urgent horns.",
    whyStar: "This track broke every rule in hip-hop. Radio was terrified of religious content, yet 'Jesus Walks' became a massive hit and won the Grammy for Best Rap Song. It proved that hip-hop could be spiritual, vulnerable, and commercially successful simultaneously. The audacity of rapping about God on mainstream radio in 2004 cannot be overstated.",
    legacy: "Widely considered one of the greatest hip-hop songs ever made. It opened the door for spiritual expression in rap, paving the way for artists like Chance the Rapper and Kendrick Lamar."
  },
  {
    title: "Through the Wire",
    features: [],
    duration: "3:58",
    rating: 9.5,
    description: "Recorded while West's jaw was still wired shut from his near-fatal car accident in October 2002. He raps through the wires over a sped-up Chaka Khan sample ('Through the Fire'), turning his trauma into triumph.",
    whyStar: "This is the origin story. West literally rapped with his jaw wired shut—you can hear the slurring in his delivery. It was released as the lead single and became the calling card for the album. The raw determination to create art despite physical agony encapsulates everything Kanye West represents. Without this song, there is no Kanye West the rapper.",
    legacy: "The song that made Kanye a rapper instead of just a producer. It convinced Roc-A-Fella to take a chance on releasing his album and became the template for 'chipmunk soul' production."
  },
  {
    title: "All Falls Down",
    features: ["Syleena Johnson"],
    duration: "3:43",
    rating: 9.5,
    description: "A self-aware critique of materialism and insecurity in Black America. Over a Lauryn Hill-sampling beat, West exposes how consumer culture preys on low self-esteem—and includes himself in the critique.",
    whyStar: "This track is a masterclass in vulnerability. While other rappers were bragging about their chains, West admitted he bought them out of insecurity. The hook, originally meant for Lauryn Hill, was reinterpreted by Syleena Johnson and became iconic. It's arguably the most honest, self-aware rap song of the 2000s, and it resonated because everyone saw themselves in it.",
    legacy: "It established West as rap's first self-aware materialist—someone who could critique a system while admitting to being part of it. This duality became his signature."
  }
];

const tracks: Track[] = [
  { number: 1, title: "Intro", features: [], duration: "0:19", description: "A brief, cinematic orchestral intro that sets the tone for the album's grand entrance.", theme: "Overture", rating: 7.0 },
  { number: 2, title: "We Don't Care", features: [], duration: "3:59", description: "A joyful, defiant anthem about surviving in a system designed against you. Features a children's choir that sounds like hope itself.", theme: "Survival & Joy", rating: 8.5 },
  { number: 3, title: "Graduation Day", features: [], duration: "1:22", description: "A spoken-word skit sampling 'I'll Fly Away,' providing comedic relief as a dropout ceremony.", theme: "Satire", rating: 6.0 },
  { number: 4, title: "All Falls Down", features: ["Syleena Johnson"], duration: "3:43", description: "A self-aware critique of materialism, where West exposes insecurity as the root of consumerism—including his own.", theme: "Materialism & Self-Awareness", rating: 9.5 },
  { number: 5, title: "I'll Fly Away", features: [], duration: "0:44", description: "A short gospel interlude bridging the album's themes of faith and freedom.", theme: "Faith", rating: 6.0 },
  { number: 6, title: "Spaceship", features: ["GLC", "Consequence"], duration: "5:24", description: "A working-class anthem about feeling trapped in dead-end jobs while dreaming of escape. West raps about working at Gap.", theme: "Aspiration & Frustration", rating: 8.5 },
  { number: 7, title: "Jesus Walks", features: [], duration: "3:13", description: "A thunderous, marching-band-driven anthem about faith and the industry's reluctance to embrace religion.", theme: "Faith & Courage", rating: 10 },
  { number: 8, title: "Never Let Me Down", features: ["Jay-Z", "J. Ivy"], duration: "5:24", description: "An emotional collaboration featuring a powerful spoken-word piece by J. Ivy and a Jay-Z verse about loyalty and perseverance.", theme: "Perseverance", rating: 9.0 },
  { number: 9, title: "Get Em High", features: ["Talib Kweli", "Common"], duration: "4:48", description: "A lyrical showcase pairing West with two of conscious rap's finest. Pure boom-bap energy.", theme: "Lyricism & Camaraderie", rating: 8.0 },
  { number: 10, title: "Workout Plan", features: [], duration: "5:22", description: "A satirical, comedic infomercial-style track about using fitness to attract wealthy men. Includes fake testimonials.", theme: "Satire & Humor", rating: 7.5 },
  { number: 11, title: "The New Workout Plan", features: [], duration: "5:22", description: "The full song version with a funkier beat and more elaborate production, turning the joke into a genuine banger.", theme: "Satire & Dance", rating: 7.5 },
  { number: 12, title: "Slow Jamz", features: ["Twista", "Jamie Foxx"], duration: "5:16", description: "A smooth, romantic track that became the album's biggest commercial hit. Jamie Foxx channels Luther Vandross over a silky beat.", theme: "Romance & Nostalgia", rating: 9.0 },
  { number: 13, title: "Breathe In Breathe Out", features: ["Ludacris"], duration: "4:05", description: "A party anthem with Ludacris trading bars. Lighthearted and fun, providing a breather in the album's flow.", theme: "Party & Fun", rating: 7.0 },
  { number: 14, title: "School Spirit", features: [], duration: "3:01", description: "A rebellious track built on an Aretha Franklin sample about the futility of traditional education for artistic minds.", theme: "Anti-Establishment", rating: 8.0 },
  { number: 15, title: "School Spirit Skit 1", features: [], duration: "1:17", description: "A hilarious skit about a graduate struggling to find a job despite their degree.", theme: "Satire", rating: 6.0 },
  { number: 16, title: "School Spirit Skit 2", features: [], duration: "0:43", description: "Continuation of the graduate's misadventures, doubling down on the album's anti-college theme.", theme: "Satire", rating: 6.0 },
  { number: 17, title: "Lil Jimmy Skit", features: [], duration: "0:47", description: "A young child brags about dropping out of school and becoming successful, embodying the album's thesis.", theme: "Comedy", rating: 6.5 },
  { number: 18, title: "Two Words", features: ["Mos Def", "Freeway", "The Harlem Boys Choir"], duration: "4:26", description: "A hard-hitting lyrical exercise with Mos Def and Freeway over a dramatic choir-backed beat.", theme: "Intensity & Poetry", rating: 8.5 },
  { number: 19, title: "Through the Wire", features: [], duration: "3:58", description: "Recorded with his jaw wired shut after a car accident. West raps over a sped-up Chaka Khan sample, turning trauma into art.", theme: "Survival & Determination", rating: 9.5 },
  { number: 20, title: "Family Business", features: [], duration: "4:37", description: "A warm, soulful tribute to family bonds. One of West's most heartfelt and universally relatable tracks.", theme: "Love & Family", rating: 9.0 },
  { number: 21, title: "Last Call", features: [], duration: "12:40", description: "A 12-minute epic closing track where West tells his entire come-up story over a smooth beat, ending with a legendary spoken monologue.", theme: "Origin Story & Triumph", rating: 9.0 }
];

const toggleTrack = (trackNum: number) => {
  expandedTrack.value = expandedTrack.value === trackNum ? null : trackNum;
};

const toggleStar = (index: number) => {
  expandedStar.value = expandedStar.value === index ? null : index;
};

const formatRating = (rating: number) => {
  return rating.toFixed(1);
};
</script>

<template>
  <div class="lr-container">
    <BackButton />
    <div class="lr-bg-overlay"></div>

    <main class="lr-content">
      <header class="lr-header">
        <div class="lr-badge">Roc-A-Fella / Def Jam • 2004</div>
        <h1 class="lr-title">The College <span class="text-gold">Dropout</span></h1>
        <p class="lr-subtitle">Where It All Began • Chipmunk Soul</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/4Uv86qWpGTxf7fU7lG5X6F?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "I was rapping with my jaw wired shut. That's dedication."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">8.2</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"A soulful debut that rewrote the rules of hip-hop."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <!-- Star Tracks Section -->
          <h2 class="lr-section-title star-title">★ Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">★</span>
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

          <!-- Full Tracklist -->
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
  --lr-primary: #5c3a1e;
  --lr-primary-light: #8b5e34;
  --lr-accent: #d4943a;
  --lr-gold: #e8a849;
  --lr-cream: #fdf5e6;
  --lr-text-muted: #c9b99a;
  --lr-glass: rgba(60, 30, 10, 0.7);

  background-color: var(--lr-primary);
  color: var(--lr-cream);
  font-family: 'Georgia', 'Times New Roman', serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse at 30% 20%, #8b5e34 0%, #3a1f0e 60%, #1a0e05 100%);
  opacity: 0.85;
  z-index: 0;
}

.lr-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
}

.lr-title {
  font-family: 'Georgia', serif;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.text-gold { color: var(--lr-gold); }

.lr-subtitle {
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 400;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-accent);
  color: #1a0e05;
  padding: 0.25rem 0.75rem;
  font-weight: 800;
  font-size: 0.75rem;
  border-radius: 99px;
  margin-bottom: 1rem;
  text-transform: uppercase;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
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
  border-bottom: 1px solid rgba(212, 148, 58, 0.3);
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
  border: 1px solid rgba(212, 148, 58, 0.2);
}

.lr-card-title {
  font-family: 'Georgia', serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-gold);
}

.lr-card-text { line-height: 1.8; color: #ede0cc; }

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid var(--lr-accent);
  font-style: italic;
  font-family: 'Georgia', serif;
  font-size: 1.2rem;
  color: var(--lr-gold);
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--lr-primary-light);
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

/* Star Tracks */
.star-title { color: var(--lr-gold) !important; }

.lr-starlist {
  list-style: none;
  padding: 0;
  margin-bottom: 3rem;
}

.lr-star-item {
  background: rgba(212, 148, 58, 0.1);
  border: 1px solid rgba(212, 148, 58, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(212, 148, 58, 0.2);
  border-color: var(--lr-gold);
}

.lr-star-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.star-icon {
  color: var(--lr-gold);
  font-size: 1.4rem;
}

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(212, 148, 58, 0.2);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: var(--lr-cream); line-height: 1.6; margin-bottom: 1rem; }

.star-why, .star-legacy {
  background: rgba(0,0,0,0.2);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  border-left: 3px solid var(--lr-gold);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-gold);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.star-why p, .star-legacy p { color: #ede0cc; line-height: 1.6; font-size: 0.95rem; }

/* Tracklist */
.lr-section-title {
  font-family: 'Georgia', serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(212, 148, 58, 0.1);
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
  color: var(--lr-accent);
  font-size: 1.2rem;
  width: 40px;
}

.track-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.track-title { font-weight: 600; font-size: 1.1rem; color: var(--lr-cream); }
.track-feat { font-size: 0.85rem; color: var(--lr-text-muted); font-style: italic; }

.track-rating {
  font-family: 'Georgia', serif;
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
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  border-left: 3px solid var(--lr-accent);
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

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>