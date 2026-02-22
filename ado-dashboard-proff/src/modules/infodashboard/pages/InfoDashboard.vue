<script setup lang="ts">
import { computed } from 'vue';
import { Search, Play } from 'lucide-vue-next';
import { useArticleSearch } from '@/modules/infodashboard/composables/useArticleSearch';
import ArticleCard from '@/modules/infodashboard/components/ArticleCard.vue';
import VideoPlayer from '@/common/components/VideoPlayer.vue';
import SelectDropdown from '@/common/components/SelectDropdown.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const {
  currentView,
  searchQuery,
  activeSearchQuery,
  activeArticle,
  activeTopicFilter,
  sortOption,
  minReadTime,
  processedArticles,
  recommendedArticles,
  openArticle,
  goHome,
  triggerSearch,
  formatDate,
  renderMarkdown,
} = useArticleSearch();

const topicOptions = computed(() => [
  { value: 'All', label: t('info.dashboard.allTopics') },
  { value: 'technology', label: t('info.dashboard.categories.technology') },
  { value: 'politics', label: t('info.dashboard.categories.politics') },
  { value: 'science', label: t('info.dashboard.categories.science') },
  { value: 'culture', label: t('info.dashboard.categories.culture') },
  { value: 'economy', label: t('info.dashboard.categories.economy') }
]);

const sortOptions = computed(() => [
  { value: 'relevance', label: t('info.dashboard.sortMethods.relevance') },
  { value: 'dateDesc', label: t('info.dashboard.sortMethods.newest') },
  { value: 'dateAsc', label: t('info.dashboard.sortMethods.oldest') },
  { value: 'readTime', label: t('info.dashboard.sortMethods.shortest') }
]);

const getSliderStyle = (current: number, max: number) => {
  const percent = max > 0 ? (current / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #fff 0%, #fff ${percent}%, #414141 ${percent}%, #414141 100%)`
  };
};
</script>

<template>
  <div class="news-container">

    <header class="navbar">
      <div class="brand" @click="goHome">
        <span class="brand-text">{{ t('info.dashboard.title') }}</span>
        <span class="brand-sub">{{ t('info.dashboard.description') }}</span>
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
          <label>{{ t('info.dashboard.topic') }}</label>
          <SelectDropdown v-model="activeTopicFilter" :options="topicOptions" />
        </div>

        <div class="toolbar-section">
          <label>{{ t('info.dashboard.sortBy') }}</label>
          <SelectDropdown v-model="sortOption" :options="sortOptions" />
        </div>

        <div class="toolbar-section">
          <label>{{ t('info.dashboard.maxTime') }} {{ minReadTime === 0 ? 'Any' : minReadTime + 'm' }}</label>
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
          <section class="hero-section" v-if="processedArticles.length > 0" @click="openArticle(processedArticles[0]!)">
            <div class="hero-image-wrapper">
              <img :src="processedArticles[0]!.imageUrl" alt="Featured" class="hero-image">
              <div v-if="processedArticles[0]!.type === 'video'" class="play-overlay">
                <Play :size="64" fill="currentColor" class="play-icon-hero"/>
              </div>
            </div>
            <div class="hero-content">
              <span class="badge">{{ t('info.dashboard.categories.' + processedArticles[0]!.topic) }}</span>
              <h1 class="hero-title">{{ t(processedArticles[0]!.titleKey) }}</h1>
              <p class="hero-excerpt">{{ t(processedArticles[0]!.excerptKey) }}</p>
              <div class="meta">
                <span>{{ processedArticles[0]!.author }}</span>
                <span class="separator"> • </span>
                <span>{{ formatDate(processedArticles[0]!.date) }}</span>
                <span v-if="processedArticles[0]!.type === 'video'" class="video-duration"> • {{ processedArticles[0]!.duration }}</span>
              </div>
            </div>
          </section>

          <div class="article-grid">
            <ArticleCard
                v-for="article in processedArticles.slice(1)"
                :key="article.id"
                :article="article"
                @click="openArticle(article)"
            />
          </div>
        </div>

        <div v-else-if="currentView === 'search'" class="view-search">
          <h2 class="section-heading">
            {{ processedArticles.length }} Ergebnis{{ processedArticles.length !== 1 ? 'se' : '' }}
          </h2>

          <div v-if="processedArticles.length === 0" class="no-results">
            <p>{{ t('global.search.noResults') }} »{{ activeSearchQuery }}«</p>
          </div>

          <div class="article-grid">
            <ArticleCard
                v-for="article in processedArticles"
                :key="article.id"
                :article="article"
                @click="openArticle(article)"
            />
          </div>
        </div>

        <div v-else-if="currentView === 'article' && activeArticle" class="view-article">

          <div v-if="activeArticle.type === 'video'" class="video-player-container">
            <VideoPlayer
                :src="activeArticle.videoUrl!"
                :poster="activeArticle.imageUrl"
            />

            <header class="article-header video-meta-header">
              <span class="badge">{{ t('info.dashboard.categories.' + activeArticle.topic) }}</span>
              <h1 class="article-title">{{ t(activeArticle.titleKey) }}</h1>
              <div class="article-meta">
                Video von <span class="highlight">{{ activeArticle.author }}</span> am {{ formatDate(activeArticle.date) }}
              </div>
              <p class="video-description">{{ t(activeArticle.excerptKey) }}</p>
            </header>
          </div>

          <article v-else class="full-article">
            <header class="article-header">
              <span class="badge">{{ t('info.dashboard.categories.' + activeArticle.topic) }}</span>
              <h1 class="article-title">{{ t(activeArticle.titleKey) }}</h1>
              <div class="article-meta">
                Von <span class="highlight">{{ activeArticle.author }}</span> am {{ formatDate(activeArticle.date) }}
                <span class="separator">|</span> {{ activeArticle.readTime }} Min
              </div>
            </header>

            <div class="article-hero">
              <img :src="activeArticle.imageUrl" class="hero-image-full"  alt="" />
              <div v-if="activeArticle.imageAttribution" class="image-attribution">
                {{ activeArticle.imageAttribution }}
              </div>
            </div>

            <div class="article-body" v-html="activeArticle.contentKey ? renderMarkdown(activeArticle.contentKey) : ''"></div>
          </article>

          <div class="recommendations">
            <h3>{{ t('info.dashboard.recommendations') }}</h3>
            <div class="rec-grid">
              <ArticleCard
                  v-for="rec in recommendedArticles"
                  :key="rec.id"
                  :article="rec"
                  @click="openArticle(rec)"
              />
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
}

h1, h2, h3, .brand-text, .hero-title, .article-title {
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
  font-size: var(--font-size-h2);
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
  cursor: pointer;
  border-radius: 999px;
  height: 4px;
  margin: 0;
  border: none;
  background-size: 100% 4px;
  background: transparent no-repeat center;
}

input[type="range"]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: transparent;
  border-radius: 999px;
  border: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  margin-top: 0;
  transform: scale(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}

input[type="range"]:hover::-webkit-slider-thumb {
  transform: scale(1);
}

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
  background: #fff;
  cursor: pointer;
  transform: scale(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="range"]:hover::-moz-range-thumb {
  transform: scale(1);
}

/* --- HOME VIEW --- */
.badge {
  color: var(--text);
  font-size: var(--font-size-body);
  width: fit-content;
  margin-bottom:6px;
}

.hero-section {
  display: grid;
  grid-template-columns: 1fr;
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

.play-overlay {
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

.play-icon-hero {
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
  font-size: var(--font-size-title);
  line-height: 1.6;
  margin: 16px 0;
}

.meta {
  font-size: var(--font-size-body);
  color: var(--sub);
}

.article-grid, .rec-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
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
  border-radius: 0;
  overflow: hidden;
}

.hero-image-full {
  width: 100%;
  display: block;
}

.image-attribution, .article-body :deep(attr) {
  display: block;
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin-top: 8px;
}

.article-body {
  font-size: var(--font-size-title);
  line-height: 1.6;
  color: var(--text);
  font-family: "Merriweather", serif;
}

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
  font-size: var(--font-size-h3);
}

.article-body :deep(img), .article-body :deep(video) {
  width: 100%;
  height: auto;
  margin: 2rem 0 0 0;
  display: block;
}

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

.video-meta-header {
  margin-top:16px;
}

.video-description {
  font-size: var(--font-size-title);
  color: var(--sub);
  margin-top: 1rem;
  line-height: 1.5;
}

.recommendations {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border2);
}

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
    font-size: var(--font-size-h1);
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