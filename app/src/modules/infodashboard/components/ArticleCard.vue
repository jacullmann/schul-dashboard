<script setup lang="ts">
import { Play } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import type { Article } from '@/modules/infodashboard/types';

const { t } = useI18n();

const props = defineProps<{
  article: Article;
}>();

const emit = defineEmits<{
  click: [article: Article];
}>();

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
</script>

<template>
  <article class="card" @click="emit('click', props.article)">
    <div class="card-image-wrapper">
      <img :src="article.imageUrl" loading="lazy" class="card-image" alt="" />
      <div v-if="article.type === 'video'" class="play-overlay-card">
        <Play :size="48" fill="currentColor" class="play-icon-card" />
      </div>
    </div>
    <div class="card-content">
      <span class="badge-small">{{
        t('info.dashboard.categories.' + article.topic)
      }}</span>
      <h3 class="card-title">{{ t(article.titleKey) }}</h3>
      <div class="card-top"></div>
      <p class="card-excerpt">{{ t(article.excerptKey) }}</p>
      <div class="card-footer">
        {{
          formatDate(article.date) +
          ' ' +
          (article.type === 'video'
            ? article.duration
            : article.readTime + ' Min')
        }}
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  overflow: hidden;
  transition: transform 0.25s ease;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--color-canvas-border);
}

.card:hover .card-image {
  transform: scale(1.02);
}

.badge-small {
  color: var(--color-on-ghost);
  font-size: 14px;
  display: inline-block;
  font-weight: normal;
  width: fit-content;
}

.play-overlay-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.play-icon-card {
  color: var(--color-on-ghost);
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
}

.card-image-wrapper {
  width: 50%;
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
  padding: 0 0 0 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-top: none;
}

.card-top {
  display: flex;
  gap: 8px;
}

.card-title {
  font-family: var(--font-display), sans-serif;
  font-size: 1.5rem;
  margin: 6px 0 0 0;
  line-height: 1.3;
  font-weight: 800;
}

.card-excerpt {
  font-size: 1rem;
  color: var(--color-on-ghost-muted);
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 8px 0;
}

.card-footer {
  font-size: 0.75rem;
  color: var(--color-on-ghost-muted);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .card {
    flex-direction: column;
  }

  .card-image-wrapper {
    width: 100%;
  }

  .card-content {
    padding: 8px 0;
  }
}
</style>
