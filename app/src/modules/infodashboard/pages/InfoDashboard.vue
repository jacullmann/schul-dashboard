<script setup lang="ts">
import { computed } from 'vue';
import { Search, Play } from '@lucide/vue';
import { useArticleSearch } from '@/modules/infodashboard/composables/useArticleSearch';
import ArticleCard from '@/modules/infodashboard/components/ArticleCard.vue';
import VideoPlayer from '@/common/components/VideoPlayer.vue';
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
  { value: 'All', label: t('infodashboard.dashboard.all_topics') },
  {
    value: 'technology',
    label: t('infodashboard.dashboard.categories.technology'),
  },
  {
    value: 'politics',
    label: t('infodashboard.dashboard.categories.politics'),
  },
  { value: 'science', label: t('infodashboard.dashboard.categories.science') },
  { value: 'culture', label: t('infodashboard.dashboard.categories.culture') },
  { value: 'economy', label: t('infodashboard.dashboard.categories.economy') },
]);

const sortOptions = computed(() => [
  {
    value: 'relevance',
    label: t('infodashboard.dashboard.sort_methods.relevance'),
  },
  {
    value: 'dateDesc',
    label: t('infodashboard.dashboard.sort_methods.newest'),
  },
  { value: 'dateAsc', label: t('infodashboard.dashboard.sort_methods.oldest') },
  {
    value: 'readTime',
    label: t('infodashboard.dashboard.sort_methods.shortest'),
  },
]);

const getSliderStyle = (current: number, max: number) => {
  const percent = max > 0 ? (current / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #fff 0%, #fff ${percent}%, #414141 ${percent}%, #414141 100%)`,
  };
};
</script>

<template>
  <div
    class="font-sans bg-canvas text-on-ghost min-h-screen w-full flex flex-col"
  >
    <header
      class="flex justify-between items-center p-4 border-b border-canvas-border bg-canvas sticky top-0 z-[100]"
    >
      <div class="cursor-pointer flex flex-col" @click="goHome">
        <span class="font-black text-[1.5rem] tracking-[-1px] font-display">{{
          t('infodashboard.dashboard.title')
        }}</span>
        <span class="text-base text-on-ghost-muted font-medium">{{
          t('infodashboard.dashboard.description')
        }}</span>
      </div>

      <div class="relative w-full max-w-[400px]">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 text-on-ghost-subtle cursor-pointer transition-[0.2s] hover:text-on-ghost"
          :size="18"
          @click="triggerSearch"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Suche"
          class="w-full bg-surface border border-surface-border shadow-input text-on-ghost p-2 px-3 pl-[42px] text-[0.95rem] transition-all focus:outline-none focus:border-on-ghost"
          @keydown.enter="triggerSearch"
        />
      </div>
    </header>

    <main class="flex-1 max-w-[1200px] w-full mx-auto p-4">
      <div
        v-if="currentView === 'search'"
        class="flex gap-4 pb-4 border-b border-canvas-border mb-4 flex-wrap"
      >
        <div class="flex flex-col gap-2">
          <label class="text-[0.8rem] text-on-ghost">{{
            t('infodashboard.dashboard.topic')
          }}</label>
          <BaseSelect v-model="activeTopicFilter" :options="topicOptions" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[0.8rem] text-on-ghost">{{
            t('infodashboard.dashboard.sort_by')
          }}</label>
          <BaseSelect v-model="sortOption" :options="sortOptions" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[0.8rem] text-on-ghost"
            >{{ t('infodashboard.dashboard.max_time') }}
            {{ minReadTime === 0 ? 'Any' : minReadTime + 'm' }}</label
          >
          <input
            v-model.number="minReadTime"
            type="range"
            min="0"
            max="30"
            step="1"
            class="appearance-none w-full cursor-pointer rounded-full h-[4px] border-none bg-transparent bg-center"
            :style="getSliderStyle(minReadTime, 30)"
          />
        </div>
      </div>

      <Transition name="fade" mode="out-in">
        <div v-if="currentView === 'home'" class="view-home">
          <section
            v-if="processedArticles.length > 0"
            class="grid grid-cols-1 gap-4 mb-16 cursor-pointer"
            @click="openArticle(processedArticles[0]!)"
          >
            <div class="aspect-video overflow-hidden rounded-none relative">
              <img
                :src="processedArticles[0]!.imageUrl"
                alt="Featured"
                class="w-full h-full object-cover transition-[0.5s]"
              />
              <div
                v-if="processedArticles[0]!.type === 'video'"
                class="absolute inset-0 bg-[rgba(0,0,0,0.1)] flex justify-center items-center"
              >
                <Play
                  :size="64"
                  fill="currentColor"
                  class="text-on-ghost drop-shadow-md"
                />
              </div>
            </div>
            <div class="flex flex-col justify-center">
              <span class="text-base text-on-ghost mb-1.5">{{
                t(
                  'infodashboard.dashboard.categories.' +
                    processedArticles[0]!.topic,
                )
              }}</span>
              <h1 class="text-[3rem]/none m-0 font-extrabold font-display">
                {{ t(processedArticles[0]!.titleKey) }}
              </h1>
              <p class="text-[1.25rem]/[1.6] text-on-ghost-muted my-4">
                {{ t(processedArticles[0]!.excerptKey) }}
              </p>
              <div class="text-base text-on-ghost-muted">
                <span>{{ processedArticles[0]!.author }}</span>
                <span class="mx-2">•</span>
                <span>{{ formatDate(processedArticles[0]!.date) }}</span>
                <span
                  v-if="processedArticles[0]!.type === 'video'"
                  class="text-on-ghost-muted"
                >
                  • {{ processedArticles[0]!.duration }}</span
                >
              </div>
            </div>
          </section>

          <div class="grid grid-cols-1 gap-8">
            <ArticleCard
              v-for="article in processedArticles.slice(1)"
              :key="article.id"
              :article="article"
              @click="openArticle(article)"
            />
          </div>
        </div>

        <div v-else-if="currentView === 'search'" class="view-search">
          <h2 class="m-0 mb-4 font-display">
            {{ processedArticles.length }} Ergebnis{{
              processedArticles.length !== 1 ? 'se' : ''
            }}
          </h2>

          <div
            v-if="processedArticles.length === 0"
            class="text-center text-on-ghost-muted p-10"
          >
            <p>{{ t('global.search.noResults') }} »{{ activeSearchQuery }}«</p>
          </div>

          <div class="grid grid-cols-1 gap-8">
            <ArticleCard
              v-for="article in processedArticles"
              :key="article.id"
              :article="article"
              @click="openArticle(article)"
            />
          </div>
        </div>

        <div
          v-else-if="currentView === 'article' && activeArticle"
          class="max-w-[800px] mx-auto"
        >
          <div v-if="activeArticle.type === 'video'" class="w-full mb-8">
            <VideoPlayer
              :src="activeArticle.videoUrl!"
              :poster="activeArticle.imageUrl"
            />

            <header class="text-left mb-8 mt-4">
              <span class="text-base text-on-ghost mb-1.5">{{
                t('infodashboard.dashboard.categories.' + activeArticle.topic)
              }}</span>
              <h1 class="text-[2.5rem]/none my-2 font-extrabold font-display">
                {{ t(activeArticle.titleKey) }}
              </h1>
              <div class="text-[0.9rem] text-on-ghost-muted mt-4">
                Video von
                <span class="text-on-ghost underline">{{
                  activeArticle.author
                }}</span>
                am
                {{ formatDate(activeArticle.date) }}
              </div>
              <p class="text-[1.25rem]/relaxed text-on-ghost-muted mt-4">
                {{ t(activeArticle.excerptKey) }}
              </p>
            </header>
          </div>

          <article v-else class="full-article">
            <header class="text-left mb-8">
              <span class="text-base text-on-ghost mb-1.5">{{
                t('infodashboard.dashboard.categories.' + activeArticle.topic)
              }}</span>
              <h1 class="text-[2.5rem]/none my-2 font-extrabold font-display">
                {{ t(activeArticle.titleKey) }}
              </h1>
              <div class="text-[0.9rem] text-on-ghost-muted mt-4">
                Von
                <span class="text-on-ghost underline">{{
                  activeArticle.author
                }}</span>
                am
                {{ formatDate(activeArticle.date) }}
                <span class="mx-2">|</span>
                {{ activeArticle.readTime }} Min
              </div>
            </header>

            <div class="w-full mb-8 rounded-none overflow-hidden">
              <img :src="activeArticle.imageUrl" class="w-full block" alt="" />
              <div
                v-if="activeArticle.imageAttribution"
                class="text-[0.75rem] text-on-ghost-muted mt-2"
              >
                {{ activeArticle.imageAttribution }}
              </div>
            </div>

            <div
              class="text-[1.25rem]/[1.6] text-on-ghost font-serif [&_p]:mb-6 [&_h2]:text-[1.8rem] [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-on-ghost [&_blockquote]:border-l-4 [&_blockquote]:border-canvas-border [&_blockquote]:my-8 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-[1.5rem] [&_img]:w-full [&_img]:h-auto [&_img]:my-8 [&_img]:block [&_video]:w-full [&_video]:h-auto [&_video]:my-8 [&_video]:block [&_strong]:text-on-ghost [&_strong]:font-bold"
              v-html="
                activeArticle.contentKey
                  ? renderMarkdown(activeArticle.contentKey)
                  : ''
              "
            ></div>
          </article>

          <div class="mt-16 pt-8 border-t border-surface-border">
            <h3 class="font-display">
              {{ t('infodashboard.dashboard.recommendations') }}
            </h3>
            <div class="grid grid-cols-1 gap-8">
              <ArticleCard
                v-for="rec in recommendedArticles"
                :key="rec.id"
                :article="rec"
                @click="openArticle(rec)"
              />
            </div>
          </div>
        </div>
      </Transition>
    </main>
  </div>
</template>

<style>
@font-face {
  font-family: 'Lora Variable';
  src:
    url('/fonts/lora-variable.woff2') format('woff2-variations'),
    url('/fonts/lora-variable.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lora Variable';
  src:
    url('/fonts/lora-variable-italic.woff2') format('woff2-variations'),
    url('/fonts/lora-variable-italic.woff2') format('woff2');
  font-weight: 400 700;
  font-style: italic;
  font-display: swap;
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
