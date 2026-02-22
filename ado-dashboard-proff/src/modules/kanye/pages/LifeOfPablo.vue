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
    title: 'The Gospel',
    content: "Released on February 14, 2016, 'The Life of Pablo' was a messy, public, living document. West changed the title multiple times (from 'So Help Me God' to 'SWISH' to 'Waves' to 'TLOP'), premiered it during a fashion show at Madison Square Garden, and kept revising the album on streaming platforms weeks after release. It was the first album to go platinum from streaming alone and was initially a TIDAL exclusive."
  },
  {
    id: 'making',
    title: 'The Chaos',
    content: "The production credits read like a who's who of modern music: Metro Boomin, Madlib, Mike Dean, Rick Rubin, Chance the Rapper, Hudson Mohawke, and dozens more. The album was famously assembled in a chaotic sprint at the studio, with tracks being reworked in real-time. Chance the Rapper's contributions to 'Ultralight Beam' were so significant that the song almost didn't make the album because West felt it was 'too good to start with.'"
  },
  {
    id: 'themes',
    title: 'The Duality',
    content: "Named after both Pablo Picasso and Pablo Escobar, the album is about the duality of the creative mind—the sacred ('Ultralight Beam') and the profane ('Father Stretch My Hands'). It wrestles with faith, family, fame, and infidelity, often within the same song. It is intentionally messy, reflecting the fragmented nature of West's psyche and modern life in the social media age."
  }
];

const starTracks: StarTrack[] = [
  {
    title: "Ultralight Beam",
    features: ["Chance the Rapper", "Kirk Franklin", "Kelly Price", "The-Dream"],
    duration: "5:20",
    rating: 10,
    description: "A transcendent gospel-rap opener featuring a show-stopping verse from Chance the Rapper, Kirk Franklin's choir, and Kelly Price's soaring vocals. The production is heavenly—sparse drums, organ swells, and choral harmonies.",
    whyStar: "This is widely considered the greatest album opener of the 2010s. Chance the Rapper's verse—'I heard you say Jesus can save / I know he does'—is his defining moment. Kirk Franklin's prayer sets a tone of genuine worship. The combination of gospel choir, minimal trap production, and raw spirituality created something that transcends genre. Even atheists were moved to tears.",
    legacy: "Won Best Rap Performance at the Grammys. Elevated Chance the Rapper from indie darling to mainstream superstar. The song is regularly cited as one of the best tracks of the decade."
  },
  {
    title: "Famous",
    features: ["Rihanna"],
    duration: "3:16",
    rating: 9.5,
    description: "An explosive track built on a Sister Nancy reggae sample, featuring Rihanna singing the hook. Contains the controversial 'Taylor Swift' lyric that reignited one of pop culture's biggest feuds.",
    whyStar: "Beyond the controversy, 'Famous' is a production masterpiece. The way it transitions from Rihanna's ethereal opening through a dancehall groove into a raw Bam Bam sample is exhilarating. The song became the most talked-about track of 2016 due to the Taylor Swift lyric, but musically, it's a fearless blend of reggae, gospel, and rap that shouldn't work but does perfectly.",
    legacy: "Spawned one of pop culture's biggest controversies. The music video, featuring wax figures of celebrities in bed, was exhibited as art. The Sister Nancy 'Bam Bam' sample introduced a generation to dancehall."
  },
  {
    title: "Saint Pablo",
    features: ["Sampha"],
    duration: "6:12",
    rating: 9.5,
    description: "The album's emotional climax, added after the initial release. Over a haunting, atmospheric beat, West delivers some of his most introspective bars about debt, mental health, and the weight of fame. Sampha's vocals provide an ethereal backdrop.",
    whyStar: "This song was added to the album weeks after its initial release—making TLOP a truly 'living' album. It contains some of West's most vulnerable and self-aware lyricism: 'I'm trying to keep my faith / But I'm looking for more.' The production by Mike Dean is vast and cinematic. It's the thesis statement of the entire album, arriving as a postscript.",
    legacy: "Inspired the 'Saint Pablo Tour' naming. Demonstrated that albums could evolve post-release. The production influenced a wave of atmospheric, sample-driven rap."
  }
];

const tracks: Track[] = [
  { number: 1, title: "Ultralight Beam", features: ["Chance the Rapper", "Kirk Franklin", "Kelly Price", "The-Dream"], duration: "5:20", description: "A transcendent gospel-rap opener. Chance the Rapper delivers a career-defining verse over choir harmonies.", theme: "Faith & Grace", rating: 10 },
  { number: 2, title: "Father Stretch My Hands Pt. 1", features: ["Kid Cudi"], duration: "2:16", description: "Euphoric gospel sample chop that launches into a manic celebration. The church-to-club transition is instant.", theme: "Ecstasy & Sacrilege", rating: 9.0 },
  { number: 3, title: "Pt. 2", features: ["Desiigner"], duration: "2:01", description: "A Desiigner-dominated sequel that rides a Metro Boomin beat. Raw trap energy.", theme: "Energy & Chaos", rating: 7.5 },
  { number: 4, title: "Famous", features: ["Rihanna"], duration: "3:16", description: "An explosive track built on a Sister Nancy reggae sample. Features the controversial Taylor Swift lyric.", theme: "Fame & Controversy", rating: 9.5 },
  { number: 5, title: "Feedback", features: [], duration: "2:27", description: "A distorted, glitchy industrial track. West raps aggressively over a pitched-down vocal loop.", theme: "Aggression & Paranoia", rating: 7.5 },
  { number: 6, title: "Low Lights", features: [], duration: "2:18", description: "A spoken-word interlude about faith during hardship. Sets the emotional palette for what follows.", theme: "Testimony & Faith", rating: 7.0 },
  { number: 7, title: "Highlights", features: ["Young Thug", "The-Dream"], duration: "3:16", description: "A bright, celebratory track about the good life. Young Thug's ad-libs add electric energy.", theme: "Joy & Gratitude", rating: 8.0 },
  { number: 8, title: "Freestyle 4", features: [], duration: "2:22", description: "A dark, twisted industrial track about lust and temptation. The beat feels like a panic attack.", theme: "Lust & Darkness", rating: 7.0 },
  { number: 9, title: "I Love Kanye", features: [], duration: "0:44", description: "A comedic a cappella skit where West parodies his own ego and fans' nostalgia.", theme: "Self-Parody", rating: 8.0 },
  { number: 10, title: "Waves", features: ["Chris Brown"], duration: "3:02", description: "A breezy, tropical-influenced track with Chris Brown's smooth vocals. Light and airy.", theme: "Freedom & Beauty", rating: 8.0 },
  { number: 11, title: "FML", features: ["The Weeknd"], duration: "3:27", description: "A dark, cinematic collaboration with The Weeknd about destroying the things you love.", theme: "Self-Sabotage & Despair", rating: 8.5 },
  { number: 12, title: "Real Friends", features: ["Ty Dolla $ign"], duration: "4:09", description: "A melancholic, piano-driven introspection about losing touch with friends after fame.", theme: "Isolation & Nostalgia", rating: 9.0 },
  { number: 13, title: "Wolves", features: ["Vic Mensa", "Sia"], duration: "4:53", description: "A haunting, minimalist track about loss and predatory fame. Sia and Vic Mensa add emotional depth.", theme: "Loss & Vulnerability", rating: 8.5 },
  { number: 14, title: "Frank's Track", features: ["Frank Ocean"], duration: "1:01", description: "A brief, beautiful Frank Ocean interlude. Dreamy and ethereal.", theme: "Love & Longing", rating: 7.5 },
  { number: 15, title: "Siiiiiiilver Surffffeeeeer Intermission", features: ["Max B"], duration: "0:38", description: "A voicemail from Max B blessing the album title. Became a viral meme.", theme: "Comedy & Blessing", rating: 6.5 },
  { number: 16, title: "30 Hours", features: ["André 3000"], duration: "5:23", description: "A reflective road-trip song about long drives and past relationships. Features an André 3000 verse.", theme: "Nostalgia & Travel", rating: 8.5 },
  { number: 17, title: "No More Parties in LA", features: ["Kendrick Lamar"], duration: "6:14", description: "A Madlib-produced lyrical showcase featuring Kendrick Lamar. Both rappers deliver top-tier verses over dusty soul samples.", theme: "Excess & Self-Awareness", rating: 9.0 },
  { number: 18, title: "Facts (Charlie Heat Version)", features: [], duration: "3:30", description: "A braggadocio-fueled track produced by Charlie Heat. Nike vs. Adidas is the central metaphor.", theme: "Competition & Business", rating: 7.5 },
  { number: 19, title: "Fade", features: ["Ty Dolla $ign", "Post Malone"], duration: "3:13", description: "A house-music-influenced club banger with a pulsing four-on-the-floor beat.", theme: "Dance & Escape", rating: 8.5 },
  { number: 20, title: "Saint Pablo", features: ["Sampha"], duration: "6:12", description: "The emotional closer. West delivers introspective bars about debt and mental health over Sampha's ethereal vocals.", theme: "Reflection & Redemption", rating: 9.5 }
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
        <div class="lr-badge">GOOD Music / Def Jam • 2016</div>
        <h1 class="lr-title">THE LIFE OF <span class="text-accent">PABLO</span></h1>
        <p class="lr-subtitle">Which / One • Which / One</p>
      </header>

      <section class="lr-player-wrapper">
        <div class="lr-vinyl-decoration"></div>
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/7gsWAHLeT0w7es6FofOXk1?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
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
                "This is a gospel album. With a lot of cursing."
              </div>
            </article>
          </transition>

          <div class="lr-review-badge">
            <span class="score">9.0</span>
            <span class="source">Pitchfork • Best New Music</span>
            <p>"Messy, sprawling, brilliant. The album as living document."</p>
          </div>
        </div>

        <div class="lr-col-tracks">
          <h2 class="lr-section-title star-title">✝ Star Tracks</h2>
          <ul class="lr-starlist">
            <li
                v-for="(star, index) in starTracks"
                :key="star.title"
                class="lr-star-item"
                :class="{ 'is-expanded': expandedStar === index }"
                @click="toggleStar(index)"
            >
              <div class="lr-star-header">
                <span class="star-icon">✝</span>
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
  --lr-primary: #f25c05;
  --lr-dark: #1a0a00;
  --lr-accent: #ff4500;
  --lr-cream: #fff5ee;
  --lr-text-muted: #c4956e;
  --lr-glass: rgba(30, 10, 0, 0.8);

  background-color: var(--lr-dark);
  color: var(--lr-cream);
  font-family: 'Impact', 'Arial Black', sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.lr-bg-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #2a0a00 0%, #1a0500 40%, #0d0300 100%);
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
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: 0px;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.text-accent { color: var(--lr-accent); }

.lr-subtitle {
  font-family: 'Courier New', monospace;
  font-size: 1.2rem;
  color: var(--lr-text-muted);
  letter-spacing: 6px;
  text-transform: uppercase;
  font-weight: 400;
}

.lr-badge {
  display: inline-block;
  background: var(--lr-accent);
  color: #fff;
  padding: 0.25rem 0.75rem;
  font-weight: 900;
  font-size: 0.75rem;
  border-radius: 0px;
  margin-bottom: 1rem;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
}

.lr-player-wrapper {
  margin: 3rem 0;
  position: relative;
  box-shadow: 0 20px 50px rgba(242, 92, 5, 0.2);
  border-radius: 0px;
  background: #000;
  border: 4px solid var(--lr-accent);
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
  border-bottom: 2px solid rgba(242, 92, 5, 0.3);
  padding-bottom: 0.5rem;
}

.lr-tab-btn {
  background: none;
  border: none;
  color: var(--lr-text-muted);
  font-family: 'Impact', sans-serif;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.lr-tab-btn.active {
  color: var(--lr-accent);
  border-bottom: 3px solid var(--lr-accent);
}

.lr-info-card {
  background: var(--lr-glass);
  backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 0px;
  border: 1px solid rgba(242, 92, 5, 0.2);
}

.lr-card-title {
  font-family: 'Impact', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--lr-accent);
  text-transform: uppercase;
}

.lr-card-text {
  line-height: 1.8;
  color: #d4b8a0;
  font-family: 'Helvetica Neue', sans-serif;
  font-weight: 300;
}

.lr-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 4px solid var(--lr-accent);
  font-style: normal;
  font-family: 'Impact', sans-serif;
  font-size: 1.2rem;
  color: var(--lr-cream);
  text-transform: uppercase;
}

.lr-review-badge {
  margin-top: 2rem;
  background: rgba(0,0,0,0.5);
  padding: 1rem;
  border-radius: 0px;
  text-align: center;
  border: 2px solid var(--lr-accent);
}

.score {
  display: block;
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--lr-accent);
  font-family: 'Impact', sans-serif;
}

.source {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--lr-text-muted);
  font-family: 'Courier New', monospace;
}

.star-title { color: var(--lr-accent) !important; }

.lr-starlist { list-style: none; padding: 0; margin-bottom: 3rem; }

.lr-star-item {
  background: rgba(242, 92, 5, 0.08);
  border: 2px solid rgba(242, 92, 5, 0.25);
  border-radius: 0px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-star-item:hover {
  background: rgba(242, 92, 5, 0.15);
  border-color: var(--lr-accent);
}

.lr-star-header { display: flex; align-items: center; gap: 0.75rem; }
.star-icon { color: var(--lr-accent); font-size: 1.4rem; }

.lr-star-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(242, 92, 5, 0.2);
  animation: slideDown 0.3s ease-out;
}

.star-desc { color: var(--lr-cream); line-height: 1.6; margin-bottom: 1rem; font-family: 'Helvetica Neue', sans-serif; font-weight: 300; }

.star-why, .star-legacy {
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 0px;
  margin-bottom: 0.75rem;
  border-left: 4px solid var(--lr-accent);
}

.star-why h4, .star-legacy h4 {
  color: var(--lr-accent);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.5rem;
  font-family: 'Impact', sans-serif;
}

.star-why p, .star-legacy p { color: #d4b8a0; line-height: 1.6; font-size: 0.95rem; font-family: 'Helvetica Neue', sans-serif; font-weight: 300; }

.lr-section-title {
  font-family: 'Impact', sans-serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--lr-cream);
  text-transform: uppercase;
}

.lr-tracklist { list-style: none; padding: 0; }

.lr-track-item {
  border-bottom: 1px solid rgba(242, 92, 5, 0.1);
  padding: 1rem 0;
  cursor: pointer;
  transition: all 0.2s;
}

.lr-track-item:hover {
  background: rgba(242, 92, 5, 0.08);
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
  color: var(--lr-accent);
  font-size: 1.2rem;
  font-weight: bold;
  width: 40px;
}

.track-info { flex-grow: 1; display: flex; flex-direction: column; }
.track-title { font-weight: 700; font-size: 1.1rem; color: var(--lr-cream); font-family: 'Helvetica Neue', sans-serif; text-transform: uppercase; }
.track-feat { font-size: 0.85rem; color: var(--lr-text-muted); font-style: italic; font-family: 'Helvetica Neue', sans-serif; }

.track-rating {
  color: var(--lr-accent);
  font-weight: 900;
  font-size: 0.95rem;
  min-width: 35px;
  text-align: right;
  margin-right: 1rem;
  font-family: 'Impact', sans-serif;
}

.track-dur { font-family: monospace; color: var(--lr-text-muted); }

.lr-track-details {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 0px;
  border-left: 4px solid var(--lr-accent);
  animation: slideDown 0.3s ease-out;
}

.detail-theme {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--lr-accent);
  margin-bottom: 0.5rem;
  letter-spacing: 2px;
  font-weight: 900;
  font-family: 'Impact', sans-serif;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>