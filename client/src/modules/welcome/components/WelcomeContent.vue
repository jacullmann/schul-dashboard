<script setup lang="ts">
// import Line from './Line.vue'
import WelcomeButtonPrimary from "@/modules/welcome/components/WelcomeButtonPrimary.vue";
import WelcomeButtonSecondary from "@/modules/welcome/components/WelcomeButtonSecondary.vue";
import ItemCard from "@/modules/tasks/components/ItemCard.vue";
import BaseCheckbox from "@/common/components/BaseCheckbox.vue";
import { Pin } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(dateString))
}

defineProps<{
  onMoreInfoClick: () => void;
}>();

function navigateToAuth() {
  router.push('/auth');
}
</script>

<template>
  <div class="welcome-section">
    <div class="text-content">
      <h1 class="headline-serif">{{ t('welcome.hero.headlineSerif') }}</h1>
      <h1 class="headline-sans" v-html="t('welcome.hero.headlineSans')" />
      <p class="subline">
        {{ t('welcome.hero.subline') }}
        <span class="free">
          <span class="line-span">
            {{ t('welcome.hero.sublineHighlight') }}
            <!--<Line class="line" />--->
          </span>
        </span>.
      </p>

      <div class="action-buttons">
        <WelcomeButtonPrimary @click="navigateToAuth"/>
        <WelcomeButtonSecondary @click="onMoreInfoClick" />
      </div>
    </div>

    <div class="visual-container">
      <div class="example-wrapper">
        <div class="example-dashboard">
          <ItemCard>
            <template #checkbox>
              <BaseCheckbox :checked="true" />
            </template>
            <template #actions-pre>
              <button type="button" class="unpin-trigger">
                <Pin :size="18" fill="currentColor" class="pinned" />
              </button>
            </template>
            <template #title>
              <h3 class="example-title">{{ t('welcome.hero.visual.items[0].title') }}</h3>
            </template>
          </ItemCard>

          <ItemCard class="only-desktop">
            <template #checkbox>
              <BaseCheckbox />
            </template>
            <template #title>
              <h3 class="example-title">{{ t('welcome.hero.visual.items[1].title') }}</h3>
            </template>
            <template #badges>
              <div class="example-badge">{{ t('global.subjects.geography') }} • {{ formatDate('2026-03-07') }}</div>
            </template>
            <template #content-after>
              <div class="example-body">
                <span>[Bild]</span>
              </div>
            </template>
          </ItemCard>

          <ItemCard>
            <template #checkbox>
              <BaseCheckbox />
            </template>
            <template #title>
              <h3 class="example-title">{{ t('welcome.hero.visual.items[2].title') }}</h3>
            </template>
            <template #badges>
              <div class="example-badge">{{ t('global.subjects.math') }} • {{ formatDate('2026-03-08') }}</div>
            </template>
            <template #content-after>
              <div class="example-body">
                <span>{{ t('welcome.hero.visual.items[2].text') }}</span>
              </div>
            </template>
          </ItemCard>

          <div class="item-card-vanishing"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Noto Serif';
  src: url('@/assets/fonts/NotoSerifLatinExtRegular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

.line {
  height: 12px;
  width: 100%;
  position: absolute;
  bottom: -5px;
  left: 0;
}
.line-span {
  display: inline-block;
  position: relative;
}
.welcome-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  max-width: 1600px;
  width: 100%;
  min-height: calc(100vh - 70px - 50px - 2rem);
  gap: 32px;
  padding: 64px;
  margin: 0 auto 64px;
}

.visual-container {
  flex: 1;
  display: flex;
  justify-content: right;
  width:100%;
}

.example-wrapper {
  flex-direction: column;
  width: 100%;
  max-width: 640px;
}

.example-dashboard {
  margin-top: 12px;
  gap: 12px;
  display:flex;
  flex-direction: column;
  justify-content: left;
}

.example-title {
  margin: -2px 0;
  font-size: 1.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 22px;
  color: var(--color-on-surface);
  font-family: var(--font-display), sans-serif;
}

.example-badge {
  color: var(--color-on-surface-muted);
  padding: 0;
  font-family: var(--font-sans), sans-serif;
  font-size: var(--text-body);
}

.example-body {
  margin-top: 8px;
  color: var(--color-on-surface);
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-family: var(--font-sans), sans-serif;
  font-size: 16px;
}

.item-card-vanishing {
  background:linear-gradient(var(--color-surface) 0%, transparent 100%);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  min-height: 30px;
}

.unpin-trigger {
  background: transparent;
  color: var(--color-on-surface-muted);
  padding: 8px;
  border-radius: var(--radius-lg);
  display: inline-flex;
  margin: -8px 4px -8px -8px;
  transition: 0.15s ease;
  border: none;
  cursor: pointer;
}

.unpin-trigger:hover {
  background: var(--color-surface-hover);
  color: var(--color-on-surface);
}

.lucide-pin {
  overflow: visible !important;
}

.pinned :deep(path:last-child) {
  transform: translateY(0) scaleY(1);
  transition: 0.1s ease;
  transform-origin: bottom;
}

.unpin-trigger:hover .pinned :deep(path:last-child) {
  transform: translateY(-8%) scaleY(1);
}

.item-card-vanishing::before {
  content: "";
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  min-height: 30px;
  display: flex;
  border: 1px solid transparent;
  background: linear-gradient(var(--color-surface-border) 0%, transparent 100%) border-box;
  -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
  mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.text-content {
  flex: 1;
  color: var(--color-on-surface);
  container-type: inline-size;
}

.headline-serif, .headline-sans {
  font-size: 13.34cqw;
  line-height: 1.1;
  margin-bottom: 0;
  text-align: left;
}

.headline-serif {
  font-weight: 500;
  letter-spacing: -0.02em;
  font-family: 'Noto Serif', serif;
  font-size-adjust: 0.5;
}

.headline-sans {
  font-weight: 900;
  letter-spacing: -0.01em;
  font-family: var(--font-sans), sans-serif;
}

:deep(b) {
  background: var(--background-image-bismuth);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  margin-top: 16px;
  color: var(--color-on-surface-muted);
  text-align: left;
}


.free {
  font-weight: 600;
  color: var(--color-on-surface);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 32px;
  justify-content: flex-start;
}

@media (max-width: 1200px) {
  .welcome-section {
    flex-direction: column;
    padding: 0;
    gap: 0;
    min-height: auto;
  }

  .text-content {
    width: 100%;
    max-width: 100%;
    order: 2;
  }

  .visual-container {
    order: 1;
    justify-content: center;
  }

  .headline-serif, .headline-sans {
    font-size: 6rem;
    text-align: center;
  }

  .subline {
    text-align: center;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .only-desktop {
    display: none;
  }

  .headline-serif {
    margin-top: -24px;
  }

  .action-buttons {
    flex-direction: row;
    gap: 8px;
  }
}

@media (max-width: 900px) {
  .headline-serif, .headline-sans {
    font-size: 13.34cqw;
  }
}
</style>