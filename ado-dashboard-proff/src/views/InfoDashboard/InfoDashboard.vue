<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue';
import {
  Search,
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  FastForward
} from 'https://esm.sh/lucide-vue-next';

// --- Types & Interfaces ---
interface Article {
  id: number;
  type: 'text' | 'video';
  title: string;
  excerpt: string;
  content?: string;
  videoUrl?: string;
  duration?: string;
  author: string;
  date: string;
  readTime: number;
  topic: 'Technologie' | 'Politik' | 'Wissenschaft' | 'Kultur' | 'Wirtschaft';
  imageUrl: string;
  imageAttribution?: string; // New field
  recommendedIds?: number[];
}

type SortOption = 'relevance' | 'dateDesc' | 'dateAsc' | 'readTime';
type ViewState = 'home' | 'search' | 'article';

// --- Mock Data ---
const articles: Article[] = [
  {
    id: 1,
    type: 'text',
    title: "Niemand hat die Absicht, einen Zaun zu errichten",
    excerpt: "„Niemand hat die Absicht, eine Mauer zu errichten.“ So hieß es vor 60 Jahren. Dann wurde eine Mauer errichtet. Heute ist es ein Zaun und statt der Sozialisten will die CDU ihn bauen.",
    content: `
      <p>Trotz der Behauptung, dass sich die Christdemokraten um die Armen, Zugewanderten und Opfer scheren, beweisen sie immer wieder: Was uns ein Dorn im Auge ist, soll weg.</p>

      <p>In New York wurde das Prinzip längst perfektioniert – Bänke mit Kurven, Abtrennungen und Stacheln sind der Trend des Jahres. Denn wenn man sich nicht hinlegen kann, geht man weg und „aus den Augen, aus dem Sinn“, oder? Leider ertönten keine feierlichen Trompeten, gefolgt von genug bezahlbaren Wohnungen und die Obdachlosen legten sich neben die Bänke. Aber die Berliner CDU glaubt, in Kreuzberg herrschen andere Gesetze. Wenn sie das ganze Geld, das für die Versorgung und Unterstützung der Suchtkranken eingeplant war, für einen riesigen Zaun um den Görlitzer Park ausgeben, dann müssten sie auf magische Weise verschwinden und keine zusätzlichen Investitionen wären nötig, so die These. Allerdings muss sich ein Denkfehler eingeschlichen haben – das einzige Problem, das verschwindet, ist die Entscheidung, wofür man 2 Mio. Euro Steuergelder ausgeben soll. </p>

      <p>Ein befragter Anwohner findet, der Park brauche definitiv Hilfe, aber in Form von Hilfe für die Abhängigen – nur schlecht, dass das im Haushalt nicht vorgesehen ist. In den letzten Monaten gab es Aufschreie im Minutentakt, eine gesunde Prise zivilen Ungehorsam und zwei Klagen vom Bezirk, die schneller abgewiesen wurden, als man sie durchlesen kann. Aber was wissen die Menschen, um die es geht, schon über das Thema? Die christlichen „Demokraten“ hören auf das Volk – allerdings nur auf die reicheren 20 % in den Randbezirken. Der Zaun ist ein Geschenk an ihre Wähler, die den Park als Schande sehen, und kommt gleich mit einer Glückwunschkarte, auf der „Wir machen alles, was ihr wollt“ steht. </p>

      <p>Solange Kai Wegner seine Symbolpolitik betreibt und jegliche Aufrufe der Bevölkerung ignoriert, scheint Geld für echte Lösungen fernzubleiben. Uns bleibt also nur noch eins zu hoffen – jeder freischaffende Pharmahändler denkt sich um 22 Uhr bei Schließung der Tore: Jetzt ist Feierabend. </p>
    `,
    author: "Herbert Fischer",
    date: "2026-01-09",
    readTime: 2,
    topic: "Politik",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/53/Berlin-kreuzberg_goerlitzer-park_20050923_527.jpg",
    imageAttribution: "Georg Slickers, CC BY-SA 2.5, via Wikimedia Commons"
  }
];

// --- State ---
const currentView = ref<ViewState>('home');
const searchQuery = ref('');
const activeSearchQuery = ref('');
const activeArticle = ref<Article | null>(null);

// Filters
const activeTopicFilter = ref<string>('All');
const sortOption = ref<SortOption>('relevance');
const minReadTime = ref<number>(0);

// --- Video Player State ---
const videoRef = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isFullscreen = ref(false);
const showControls = ref(true);

// Video Speed & Interaction State
const isFastForwarding = ref(false);
const wasPlayingBeforeFastForward = ref(false);
const showVolumeSlider = ref(false);
let volumeTimeout: number;

let controlsTimeout: number;
let animationFrameId: number;

// --- Helper: Optimized Levenshtein Distance ---
const getLevenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;

  if (Math.abs(a.length - b.length) > 2) return Infinity;

  if (a.length > b.length) [a, b] = [b, a];

  let prevRow = Array.from({ length: a.length + 1 }, (_, i) => i);
  let currentRow = new Array(a.length + 1);

  for (let i = 1; i <= b.length; i++) {
    currentRow[0] = i;
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        currentRow[j] = prevRow[j - 1];
      } else {
        currentRow[j] = Math.min(
            prevRow[j - 1], // substitution
            prevRow[j],     // deletion
            currentRow[j - 1] // insertion
        ) + 1;
      }
    }
    [prevRow, currentRow] = [currentRow, prevRow];
  }

  return prevRow[a.length];
};

// --- Main Search Logic ---
const searchResults = computed(() => {
  if (!activeSearchQuery.value.trim() && currentView.value === 'search') return articles;
  if (!activeSearchQuery.value.trim()) return [];

  const queryTerms = activeSearchQuery.value.toLowerCase().split(/\s+/).filter(q => q.length > 0);
  const totalTerms = queryTerms.length;

  const scored = articles.map(article => {
    // 1. Prepare raw strings
    const titleLower = (article.title || "").toLowerCase();
    const contentText = article.content || "";
    const excerptText = article.excerpt || "";

    // 2. Clean HTML tags for better matching
    // We replace tags with a space to prevent words from merging (e.g. <h1><p> -> " ")
    const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, ' ');

    const contentCleaned = stripHtml(contentText) + " " + stripHtml(excerptText);
    const contentLower = contentCleaned.toLowerCase();

    // 3. Create set of words for fuzzy matching (using cleaned text)
    // We also strip punctuation to ensure "Berlin." matches "Berlin"
    const wordsCleaned = (titleLower + " " + contentLower).replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, "");
    const articleWords = new Set(wordsCleaned.split(/\s+/));

    let matchedTermsCount = 0;
    let score = 0;

    queryTerms.forEach(term => {
      let isMatch = false;
      // Check exact match (using cleaned string helps, but we can also check raw if needed)
      // Checking cleaned string is usually better so hidden HTML attributes don't trigger false positives
      if (titleLower.includes(term) || contentLower.includes(term)) {
        isMatch = true;
        score += 10;
      } else {
        // Fuzzy Search on cleaned words
        for (const word of articleWords) {
          if (Math.abs(word.length - term.length) > 2) continue;
          const allowedEdits = term.length > 4 ? 2 : 1;
          if (getLevenshteinDistance(term, word) <= allowedEdits) {
            isMatch = true;
            score += 3;
            break;
          }
        }
      }

      if (isMatch) {
        matchedTermsCount++;
      }
    });

    return { article, score, matchedTermsCount };
  });

  return scored
      .filter(item => {
        // If we have terms, we expect at least some relevance.
        // 2/3 ratio is strict, but fair.
        const matchRatio = item.matchedTermsCount / totalTerms;
        return matchRatio >= (2/3);
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.article);
});

// --- Filtering & Sorting ---
const processedArticles = computed(() => {
  let list = currentView.value === 'search' || activeSearchQuery.value
      ? searchResults.value
      : articles;

  if (activeTopicFilter.value !== 'All') {
    list = list.filter(a => a.topic === activeTopicFilter.value);
  }

  if (minReadTime.value > 0) {
    list = list.filter(a => a.readTime <= minReadTime.value);
  }

  return [...list].sort((a, b) => {
    switch (sortOption.value) {
      case 'dateDesc': return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'dateAsc': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'readTime': return a.readTime - b.readTime;
      case 'relevance': default: return 0;
    }
  });
});

// --- Actions ---
const openArticle = (article: Article) => {
  activeArticle.value = article;
  currentView.value = 'article';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (article.type === 'video') {
    isPlaying.value = false;
    currentTime.value = 0;
  }
};

const goHome = () => {
  currentView.value = 'home';
  searchQuery.value = '';
  activeSearchQuery.value = '';
  activeArticle.value = null;
  activeTopicFilter.value = 'All';
  cancelAnimationFrame(animationFrameId);
};

const triggerSearch = () => {
  activeSearchQuery.value = searchQuery.value;
  if (activeSearchQuery.value.length > 0) {
    currentView.value = 'search';
  } else {
    currentView.value = 'search';
  }
};

// --- Updated Recommendation Logic ---
const recommendedArticles = computed(() => {
  if (!activeArticle.value) return [];

  const current = activeArticle.value;
  const maxRecs = 3;
  let recs: Article[] = [];
  const addedIds = new Set<number>([current.id]);

  // 1. Specific Recommendations (Manual IDs)
  if (current.recommendedIds && current.recommendedIds.length > 0) {
    // Find articles matching the IDs, preserving order of IDs array
    const specificRecs = current.recommendedIds
        .map(id => articles.find(a => a.id === id))
        .filter((a): a is Article => !!a); // Remove undefined results

    specificRecs.forEach(a => {
      if (!addedIds.has(a.id) && recs.length < maxRecs) {
        recs.push(a);
        addedIds.add(a.id);
      }
    });
  }

  // If full, return early
  if (recs.length >= maxRecs) return recs;

  // Helper to sort by date descending
  const sortByDateDesc = (a: Article, b: Article) =>
      new Date(b.date).getTime() - new Date(a.date).getTime();

  // 2. Same Topic Recommendations
  const sameTopic = articles
      .filter(a => a.topic === current.topic && !addedIds.has(a.id))
      .sort(sortByDateDesc);

  while (recs.length < maxRecs && sameTopic.length > 0) {
    const next = sameTopic.shift()!;
    recs.push(next);
    addedIds.add(next.id);
  }

  // If full, return early
  if (recs.length >= maxRecs) return recs;

  // 3. Fallback: Newest General
  const fallback = articles
      .filter(a => !addedIds.has(a.id))
      .sort(sortByDateDesc);

  while (recs.length < maxRecs && fallback.length > 0) {
    const next = fallback.shift()!;
    recs.push(next);
    addedIds.add(next.id);
  }

  return recs;
});

// --- Video Player Logic ---
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};

const updateLoop = () => {
  if (videoRef.value && !videoRef.value.paused) {
    currentTime.value = videoRef.value.currentTime;
    animationFrameId = requestAnimationFrame(updateLoop);
  }
};

// --- Interaction State Variables for Fix ---
let ffStartTime = 0;
let ignoreNextClick = false;
let ffTimer: number;

// NEW: Event Handlers to ensure Source of Truth
const handleVideoPlay = () => {
  isPlaying.value = true;
  updateLoop();
};

const handleVideoPause = () => {
  isPlaying.value = false;
  cancelAnimationFrame(animationFrameId);
};

// UPDATED: Toggle Play relying on element state
const togglePlay = (e?: Event) => {
  // Fix: If a fast forward (hold) action just finished, we ignore this click
  if (ignoreNextClick) {
    ignoreNextClick = false;
    return;
  }

  // Prevent click from propagating if needed
  if (e) e.stopPropagation();

  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play();
    // isPlaying and loop handled by @play event
  } else {
    videoRef.value.pause();
    // isPlaying and loop handled by @pause event
  }
};

const updateTime = () => {
  if (videoRef.value) {
    // Handled by Loop mostly
  }
};

const loadMetadata = () => {
  if (videoRef.value) duration.value = videoRef.value.duration;
};

const seek = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (videoRef.value) {
    const val = Number(target.value);
    videoRef.value.currentTime = val;
    currentTime.value = val;
  }
};

const updateVolume = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (videoRef.value) {
    volume.value = Number(target.value);
    videoRef.value.volume = volume.value;
  }
};

// NEW: Toggle Mute Function
const toggleMute = () => {
  volume.value = volume.value === 0 ? 1 : 0;
  if (videoRef.value) {
    videoRef.value.volume = volume.value;
  }
};

const toggleFullscreen = () => {
  if (!videoRef.value) return;
  if (!document.fullscreenElement) {
    videoRef.value.parentElement?.requestFullscreen();
    // isFullscreen.value = true; // Moved to event listener
  } else {
    document.exitFullscreen();
    // isFullscreen.value = false; // Moved to event listener
  }
};

const handleMouseMove = () => {
  showControls.value = true;
  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) showControls.value = false;
  }, 3000);
};

const handleMouseLeave = () => {
  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) showControls.value = false;
  }, 3000);
};

// --- Fast Forward Logic ---
const startFastForward = (e: Event) => {
  // Only trigger on left click if mouse event
  if (e instanceof MouseEvent && e.button !== 0) return;

  if (!videoRef.value) return;

  ffStartTime = Date.now(); // Mark start time to distinguish hold vs click
  wasPlayingBeforeFastForward.value = !videoRef.value.paused;

  // Set a timeout to delay the activation of fast forward
  // This prevents the badge from flashing on quick clicks (pausing/playing)
  ffTimer = setTimeout(() => {
    if (!videoRef.value) return;

    // Start playing if paused so we see the frames moving
    if (videoRef.value.paused) {
      videoRef.value.play();
      // loop handled by @play event
    }

    videoRef.value.playbackRate = 2.0;
    isFastForwarding.value = true;
  }, 200); // 200ms delay matches reasonable click duration
};

const stopFastForward = () => {
  clearTimeout(ffTimer); // Cancel the pending fast forward if it was a short click

  if (!videoRef.value) return;

  // FIX: Guard clause. If ffStartTime is 0, the action was already handled by mouseup.
  // This prevents mouseleave from using a stale timestamp.
  if (ffStartTime === 0) return;

  // Check duration. If > 200ms, it was a hold. Ignore the subsequent 'click' event.
  const duration = Date.now() - ffStartTime;

  if (duration > 200) {
    ignoreNextClick = true;
    // Reset flag shortly after just in case event loop quirks occur
    setTimeout(() => { ignoreNextClick = false; }, 100);
  }

  // Only reset playback rate if we actually entered fast forward mode
  if (isFastForwarding.value) {
    videoRef.value.playbackRate = 1.0;
    isFastForwarding.value = false;
  }

  // Restore state if we were actually fast forwarding (Hold action)
  if (duration > 200) {
    if (!wasPlayingBeforeFastForward.value) {
      videoRef.value.pause();
    } else {
      // Ensure state reflects playing
      videoRef.value.play();
    }
  }

  // FIX: Reset the start time so subsequent events (like mouseleave)
  // know that the interaction is over.
  ffStartTime = 0;
};

// --- Volume Hover Logic ---
const handleVolumeEnter = () => {
  clearTimeout(volumeTimeout);
  showVolumeSlider.value = true;
};

const handleVolumeLeave = () => {
  volumeTimeout = setTimeout(() => {
    showVolumeSlider.value = false;
  }, 1000);
};

// --- Slider Style Helper ---
const getSliderStyle = (current: number, max: number) => {
  const percent = max > 0 ? (current / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #F1F1F1 0%, #F1F1F1 ${percent}%, #414141 ${percent}%, #414141 100%)`
  };
};

// --- Keyboard Controls ---
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (currentView.value !== 'article' || activeArticle.value?.type !== 'video' || !videoRef.value) {
    return;
  }
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return;
  }

  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      togglePlay();
      handleMouseMove();
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (videoRef.value) {
        videoRef.value.currentTime += 5;
        currentTime.value = videoRef.value.currentTime;
      }
      handleMouseMove();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (videoRef.value) {
        videoRef.value.currentTime -= 5;
        currentTime.value = videoRef.value.currentTime;
      }
      handleMouseMove();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (videoRef.value) {
        const newVol = Math.min(1, volume.value + 0.1);
        volume.value = newVol;
        videoRef.value.volume = newVol;
      }
      handleMouseMove();
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (videoRef.value) {
        const newVol = Math.max(0, volume.value - 0.1);
        volume.value = newVol;
        videoRef.value.volume = newVol;
      }
      handleMouseMove();
      break;
    case 'm':
    case 'M':
      volume.value = volume.value === 0 ? 1 : 0;
      if (videoRef.value) videoRef.value.volume = volume.value;
      handleMouseMove();
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  clearTimeout(controlsTimeout);
  clearTimeout(volumeTimeout);
  cancelAnimationFrame(animationFrameId);
});

// Formatting
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
</script>

<template>
  <div class="news-container">

    <header class="navbar">
      <div class="brand" @click="goHome">
        <span class="brand-text">Info Dashboard</span>
        <span class="brand-sub">Spannende Geschichte rund um den globus</span>
      </div>

      <div class="search-wrapper">
        <Search
            class="search-icon"
            :size="18"
            @click="triggerSearch"
        />
        <input
            v-model="searchQuery"
            @keydown.enter="triggerSearch"
            type="text"
            placeholder="Suche"
            class="search-input"
        />
      </div>
    </header>

    <main class="content-area">

      <div v-if="currentView === 'search'" class="toolbar">
        <div class="toolbar-section">
          <label>Thema:</label>
          <select v-model="activeTopicFilter">
            <option value="All">Alle Themen</option>
            <option value="Technologie">Technologie</option>
            <option value="Politik">Politik</option>
            <option value="Wissenschaft">Wissenschaft</option>
            <option value="Kultur">Kultur</option>
            <option value="Wirtschaft">Wirtschaft</option>
          </select>
        </div>

        <div class="toolbar-section">
          <label>Sortieren:</label>
          <select v-model="sortOption">
            <option value="relevance">Relevanz</option>
            <option value="dateDesc">Neueste</option>
            <option value="dateAsc">Älteste</option>
            <option value="readTime">Kürzeste Lesezeit</option>
          </select>
        </div>

        <div class="toolbar-section">
          <label>Max. Lesezeit: {{ minReadTime === 0 ? 'Any' : minReadTime + 'm' }}</label>
          <input
              type="range"
              v-model.number="minReadTime"
              min="0"
              max="30"
              step="1"
              :style="getSliderStyle(minReadTime, 30)"
          >
        </div>
      </div>

      <transition name="fade" mode="out-in">
        <div v-if="currentView === 'home'" class="view-home">
          <section class="hero-section" v-if="processedArticles.length > 0" @click="openArticle(processedArticles[0])">
            <div class="hero-image-wrapper">
              <img :src="processedArticles[0].imageUrl" alt="Featured" class="hero-image">
              <div v-if="processedArticles[0].type === 'video'" class="play-overlay">
                <Play :size="64" fill="currentColor" class="play-icon-hero"/>
              </div>
            </div>
            <div class="hero-content">
              <span class="badge">{{ processedArticles[0].topic }}</span>
              <h1 class="hero-title">{{ processedArticles[0].title }}</h1>
              <p class="hero-excerpt">{{ processedArticles[0].excerpt }}</p>
              <div class="meta">
                <span>{{ processedArticles[0].author }}</span>
                <span class="separator"> • </span>
                <span>{{ formatDate(processedArticles[0].date) }}</span>
                <span v-if="processedArticles[0].type === 'video'" class="video-duration"> • {{ processedArticles[0].duration }}</span>
              </div>
            </div>
          </section>

          <div class="article-grid">
            <article
                v-for="article in processedArticles.slice(1)"
                :key="article.id"
                class="card"
                @click="openArticle(article)"
            >
              <div class="card-image-wrapper">
                <img :src="article.imageUrl" loading="lazy" class="card-image" />
                <div v-if="article.type === 'video'" class="play-overlay-card">
                  <Play :size="48" fill="currentColor" class="play-icon-card"/>
                </div>
              </div>
              <div class="card-content">
                <span class="badge-small">{{ article.topic }}</span>
                <h3 class="card-title">{{ article.title }}</h3>
                <div class="card-top">

                </div>
                <p class="card-excerpt">{{ article.excerpt }}</p>
                <div class="card-footer">
                  {{ formatDate(article.date) + ' ' + (article.type === 'video' ? article.duration : article.readTime + ' Min') }}
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-else-if="currentView === 'search'" class="view-search">
          <h2 class="section-heading">
            {{ processedArticles.length }} Ergebnis{{ processedArticles.length !== 1 ? 'se' : '' }}
          </h2>

          <div v-if="processedArticles.length === 0" class="no-results">
            <p>Keine Suchergebnisse für »{{ activeSearchQuery }}«</p>
          </div>

          <div class="article-grid">
            <article
                v-for="article in processedArticles"
                :key="article.id"
                class="card"
                @click="openArticle(article)"
            >
              <div class="card-image-wrapper">
                <img :src="article.imageUrl" loading="lazy" class="card-image" />
                <div v-if="article.type === 'video'" class="play-overlay-card">
                  <Play :size="48" fill="currentColor" class="play-icon-card"/>
                </div>
              </div>
              <div class="card-content">
                <span class="badge-small">{{ article.topic }}</span>
                <h3 class="card-title">{{ article.title }}</h3>
                <div class="card-top">

                </div>
                <p class="card-excerpt">{{ article.excerpt }}</p>
                <div class="card-footer">
                  {{ formatDate(article.date) + ' ' + (article.type === 'video' ? article.duration : article.readTime + ' Min') }}
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-else-if="currentView === 'article' && activeArticle" class="view-article">

          <div v-if="activeArticle.type === 'video'" class="video-player-container">
            <div class="video-wrapper" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
              <transition name="fade">
                <div v-if="isFastForwarding" class="fast-forward-overlay">
                  <span>2x</span>
                  <FastForward fill="currentColor" :size="24" :stroke-width="2" absoluteStrokeWidth/>
                </div>
              </transition>

              <video
                  ref="videoRef"
                  class="main-video"
                  :src="activeArticle.videoUrl"
                  :poster="activeArticle.imageUrl"
                  @click="togglePlay"
                  @timeupdate="updateTime"
                  @loadedmetadata="loadMetadata"
                  @mousedown="startFastForward"
                  @mouseup="stopFastForward"
                  @mouseleave="stopFastForward"
                  @touchstart="startFastForward"
                  @touchend="stopFastForward"
                  @play="handleVideoPlay"
                  @pause="handleVideoPause"
                  @ended="handleVideoPause"
              ></video>

              <div class="video-controls" :class="{ 'controls-hidden': (!showControls && isPlaying) || isFastForwarding }">
                <div class="scrub-bar-container">
                  <input
                      type="range"
                      min="0"
                      :max="duration"
                      :value="currentTime"
                      step="0.01"
                      @input="seek"
                      class="scrub-bar"
                      :style="getSliderStyle(currentTime, duration)"
                      aria-label="Video spulen"
                  >
                </div>

                <div class="controls-row">
                  <div class="controls-left">
                    <button class="player-btn" @click="togglePlay" :aria-label="isPlaying ? 'Pausieren' : 'Abspielen'">
                      <Pause v-if="isPlaying" fill="currentColor" :size="24" :stroke-width="2" absoluteStrokeWidth/>
                      <Play v-else fill="currentColor" :size="24" :stroke-width="2" absoluteStrokeWidth/>
                    </button>

                    <div class="volume-control-group" @mouseenter="handleVolumeEnter" @mouseleave="handleVolumeLeave">
                      <button class="player-btn" @click="toggleMute" :aria-label="volume === 0 ? 'Ton einschalten' : 'Stummschalten'">
                        <VolumeX v-if="volume === 0" fill="currentColor" :size="24" :stroke-width="2" absoluteStrokeWidth/>
                        <Volume2 v-else :size="24" fill="currentColor" :stroke-width="2" absoluteStrokeWidth/>
                      </button>
                      <div class="volume-slider-wrapper" :class="{ 'visible': showVolumeSlider }">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            :value="volume"
                            @input="updateVolume"
                            class="volume-slider"
                            :style="getSliderStyle(volume, 1)"
                            aria-label="Lautstärke"
                        >
                      </div>
                    </div>

                    <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
                  </div>

                  <div class="controls-right">
                    <button class="player-btn" @click="toggleFullscreen" :aria-label="isFullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus aktivieren'">
                      <Minimize v-if="isFullscreen" :size="24" :stroke-width="2" absoluteStrokeWidth/>
                      <Maximize v-else :size="24" :stroke-width="2" absoluteStrokeWidth/>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <header class="article-header video-meta-header">
              <span class="badge">{{ activeArticle.topic }}</span>
              <h1 class="article-title">{{ activeArticle.title }}</h1>
              <div class="article-meta">
                Video von <span class="highlight">{{ activeArticle.author }}</span> am {{ formatDate(activeArticle.date) }}
              </div>
              <p class="video-description">{{ activeArticle.excerpt }}</p>
            </header>
          </div>

          <article v-else class="full-article">
            <header class="article-header">
              <span class="badge">{{ activeArticle.topic }}</span>
              <h1 class="article-title">{{ activeArticle.title }}</h1>
              <div class="article-meta">
                Von <span class="highlight">{{ activeArticle.author }}</span> am {{ formatDate(activeArticle.date) }}
                <span class="separator">|</span> {{ activeArticle.readTime }} Min
              </div>
            </header>

            <div class="article-hero">
              <img :src="activeArticle.imageUrl" class="hero-image-full" />
              <div v-if="activeArticle.imageAttribution" class="image-attribution">
                {{ activeArticle.imageAttribution }}
              </div>
            </div>

            <div class="article-body" v-html="activeArticle.content"></div>
          </article>

          <div class="recommendations">
            <h3>Das könnte dich auch interessieren</h3>
            <div class="rec-grid">
              <article
                  v-for="rec in recommendedArticles"
                  :key="rec.id"
                  class="card"
                  @click="openArticle(rec)"
              >
                <div class="card-image-wrapper">
                  <img :src="rec.imageUrl" loading="lazy" class="card-image" />
                  <div v-if="rec.type === 'video'" class="play-overlay-card">
                    <Play :size="48" fill="currentColor" class="play-icon-card"/>
                  </div>
                </div>
                <div class="card-content">
                  <span class="badge-small">{{ rec.topic }}</span>
                  <h3 class="card-title">{{ rec.title }}</h3>
                  <div class="card-top">

                  </div>
                  <p class="card-excerpt">{{ rec.excerpt }}</p>
                  <div class="card-footer">
                    {{ formatDate(rec.date) + ' ' + (rec.type === 'video' ? rec.duration : rec.readTime + ' Min') }}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </transition>

    </main>
  </div>
</template>

<style scoped>
.news-container {

  font-family: var(--normal-font), sans-serif;
  background-color: var(--bg);
  color: var(--text);
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;

  .dm-serif-text-regular {
    font-family: "DM Serif Text", serif;
    font-weight: 400;
    font-style: normal;
  }

  .dm-serif-text-regular-italic {
    font-family: "DM Serif Text", serif;
    font-weight: 400;
    font-style: italic;
  }

}

h1, h2, h3, .brand-text, .hero-title, .article-title, .card-title {
  font-family: var(--display-font), sans-serif;
}

/* --- HEADER --- */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.brand-text {
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: -1px;
}

.brand-sub {
  font-size: 0.8rem;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sub);
  cursor: pointer;
  transition: 0.2s ease;
}

.search-icon:hover {
  color: var(--text);
}

.search-input {
  width: 100%;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 10px 12px 10px 42px;
  font-size: 0.95rem;
  transition: all 0.1s;
}

.search-input:focus {
  outline: none;
  border-color: var(--text);
}

/* --- MAIN LAYOUT --- */
.content-area {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
}

/* --- TOOLBAR --- */
.toolbar {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toolbar label {
  font-size: 0.8rem;
  color: var(--text);
}

select {
  background: var(--vlbg);
  color: var(--text);
  border: 1px solid var(--border2);
  padding: 10px 12px;
}

select:hover {
  background: var(--ghost--hover);
}

.section-heading {
  margin: 0 0 16px 0;
}

/* --- CUSTOM SLIDER STYLING --- */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  background: transparent;
  cursor: pointer;
  border-radius: 999px; /* Rounded pill shape */
  height: 4px; /* Hitbox height */
  margin: 0;
  border: none;
  /* UPDATED: Constrain the visual gradient to a 4px center strip */
  background-size: 100% 4px;
  background-position: center;
  background-repeat: no-repeat;
}

/* Track (webkit) */
input[type="range"]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px; /* Matches input height for full clickability */
  cursor: pointer;
  background: transparent; /* Transparent so we see input background */
  border-radius: 999px;
  border: none;
}

/* Thumb (webkit) */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: #F1F1F1;
  cursor: pointer;
  margin-top: 0px; /* Centered in 12px track */
  transform: scale(0); /* Default state: invisible/scaled down */
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1); /* Smooth grow animation */
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}

/* Show thumb on hover with scale */
input[type="range"]:hover::-webkit-slider-thumb {
  transform: scale(1);
}

/* Firefox Support */
input[type="range"]::-moz-range-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: transparent;
  border-radius: 999px;
  border: none;
}

input[type="range"]::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border: none;
  border-radius: 50%;
  background: #F1F1F1;
  cursor: pointer;
  transform: scale(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="range"]:hover::-moz-range-thumb {
  transform: scale(1);
}

/* --- CARDS & GRID --- */
.card {
  overflow: hidden;
  transition: transform 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: row; /* UPDATED: Horizontal layout */
  align-items: stretch;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.card:hover .card-image {
  transform: scale(1.02);
}

.badge {
  color: var(--text);
  font-size: 14px;
  width: fit-content;
  margin-bottom:6px;
}

.badge-small {
  color: var(--text);
  font-size: 14px;
  display: inline-block;
  font-weight: normal;
  width: fit-content;
}

/* --- HOME VIEW --- */
.hero-section {
  display: grid;
  grid-template-columns: 1fr;
  /* grid-template-columns: 1.5fr 1fr; */
  gap: 16px;
  margin-bottom: 64px;
  cursor: pointer;
}

.hero-image-wrapper {
  aspect-ratio: 16/9;
  overflow: hidden;
  border-radius: 0;
  position: relative;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.play-overlay, .play-overlay-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.play-icon-hero, .play-icon-card {
  color: var(--text);
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}

.hero-section:hover .hero-image {
  transform: scale(1.02);
}

.hero-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-title {
  font-size: 3rem;
  line-height: 1;
  margin: 0;
  font-weight: 800;
}

.hero-excerpt {
  color: var(--sub);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 16px 0;
}

.meta {
  font-size: 0.85rem;
  color: var(--sub);
}

.article-grid, .rec-grid {
  display: grid;
  grid-template-columns: 1fr; /* UPDATED: Strictly Vertical */
  gap: 32px;
}

.card-image-wrapper {
  width: 50%; /* UPDATED: Fixed width for horizontal layout */
  height: auto;
  aspect-ratio: 16/9;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.card-content {
  padding: 0 0 0 24px; /* UPDATED: Left padding instead of vertical padding */
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-top:none;
}

.card-top {
  display: flex;
  gap:8px;
}

.card-title {
  font-size: 1.5rem;
  margin: 6px 0 0 0;
  line-height: 1.3;
  font-weight:800;
}

.card-excerpt {
  font-size: 1rem;
  color: var(--sub);
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin:8px 0;
}

.card-footer {
  font-size: 0.75rem;
  color: var(--sub);
  margin-top:8px;
}

/* --- ARTICLE VIEW --- */
.view-article {
  max-width: 800px;
  margin: 0 auto;
}

.article-header {
  text-align: left;
  margin-bottom: 32px;
}

.article-title {
  font-size: 2.5rem;
  line-height:1;
  margin: 8px 0 16px 0;
  font-weight:800;
}

.article-meta {
  color: var(--sub);
  margin-top:16px;
}

.highlight {
  color: var(--text);
  text-decoration: underline;
}

.article-hero {
  width: 100%;
  margin-bottom: 2rem;
  border-radius: 0px;
  overflow: hidden;
}

.hero-image-full {
  width: 100%;
  display: block;
}

.image-attribution, .article-body :deep(attr) {
  display: block;
  font-size: 0.85rem;
  color: var(--sub);
  margin-top: 8px;
}

.article-body {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--text);
  font-family: "Merriweather", serif;
}

/* Rich Text Formatting Styles for injected HTML */
.article-body :deep(p) {
  margin-bottom: 1.5rem;
}

.article-body :deep(h2) {
  font-size: 1.8rem;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text);
}

.article-body :deep(blockquote) {
  border-left: 4px solid var(--border);
  margin: 2rem 0;
  padding-left: 1.5rem;
  font-style: italic;
  font-size: 1.25rem;
}

.article-body :deep(img), .article-body :deep(video) {
  width: 100%;
  height: auto;
  margin: 2rem 0 0 0; /* Adjusted to accommodate attr if present */
  display: block;
}

/* If no attr, give margin bottom to img */
.article-body :deep(img):not(+ attr), .article-body :deep(video):not(+ attr) {
  margin-bottom: 2rem;
}

.article-body :deep(strong) {
  color: var(--text);
  font-weight: 700;
}

/* --- VIDEO PLAYER STYLES --- */
.video-player-container {
  width: 100%;
  margin-bottom: 2rem;
}

.video-wrapper {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 0px;
  overflow: hidden;
  aspect-ratio: 16/9;
}

.main-video {
  width: 100%;
  height: 100%;
  display: block;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: opacity 0.3s;
}

.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.controls-left, .controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-btn {
  background: none;
  border: none;
  color: #f1f1f1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-display {
  font-size: 12px;
  font-family: monospace;
  color: var(--text);
}

.scrub-bar-container {
  width: 100%;
  display: flex;
  align-items: center;
}

.scrub-bar {
  width: 100%;
  cursor: pointer;
}

.volume-control-group {
  display: flex;
  align-items: center;
}

/* Smooth Volume Animation */
.volume-slider-wrapper {
  width: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  opacity: 1;
  display: flex;
  align-items: center;
  margin-left: 0;
}

.volume-slider-wrapper.visible {
  width: 70px; /* Adjust based on desired slider width + margins */
  opacity: 1;
  margin-left: 8px;
}

.volume-slider {
  width: 60px;
  flex-shrink: 0;
}

/* Fast Forward Overlay */
.fast-forward-overlay {
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  /*backdrop-filter: blur(4px);*/
  padding: 8px 16px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f1f1;
  pointer-events: none; /* Let clicks pass through */
  z-index: 20;
}

.video-meta-header {
  margin-top:16px;
}

.video-description {
  font-size: 1.1rem;
  color: var(--sub);
  margin-top: 1rem;
  line-height: 1.5;
}

.recommendations {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border2);
}

/*.rec-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 16px;
}*/

/* --- ANIMATIONS --- */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* --- MOBILE LAYOUT --- */
@media (max-width: 1000px) {
  .navbar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .search-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .card {
    flex-direction: column;
  }

  .card-image-wrapper {
    width: 100%;
  }

  .card-content {
    padding: 8px 0;
  }

  .content-area {
    padding: 0;
  }

  .article-grid {
    margin-inline: 16px;
  }

  .hero-content {
    margin-inline: 16px;
  }

  .article-header {
    margin: 16px 16px 32px 16px
  }

  .article-body {
    margin-inline: 16px;
  }

  .recommendations {
    margin-inline: 16px;
  }

  .toolbar {
    margin: 16px;
  }

  .section-heading {
    margin-inline: 16px;
  }
}
</style>