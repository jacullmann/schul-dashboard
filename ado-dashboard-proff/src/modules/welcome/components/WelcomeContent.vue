<script setup lang="ts">
import Line from './Line.vue'
import WelcomeButtonPrimary from "@/modules/welcome/components/WelcomeButtonPrimary.vue";
import WelcomeButtonSecondary from "@/modules/welcome/components/WelcomeButtonSecondary.vue";
import ItemCard from "@/modules/tasks/components/ItemCard.vue";
import Checkbox from "@/common/components/Checkbox.vue";
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
  router.push('/welcome/auth');
}
</script>

<template>
  <div class="welcome-section">
    <div class="visual-container">
      <div class="example-wrapper">
        <div class="example-dashboard">
          <ItemCard>
            <template #checkbox>
              <Checkbox :checked="true" />
            </template>
            <template #title>
              <h3 class="example-title">{{ t('welcome.hero.visual.items[0].title') }}</h3>
            </template>
          </ItemCard>

          <ItemCard class="only-desktop">
            <template #checkbox>
              <Checkbox />
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
              <Checkbox />
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

    <div class="text-content">
      <h1 class="headline">{{ t('welcome.hero.headline') }}</h1>
      <p class="subline">
        {{ t('welcome.hero.subline') }}
        <span class="free">
          <span class="line-span">
            {{ t('welcome.hero.sublineHighlight') }}
            <Line class="line" />
          </span>
        </span>.
      </p>

      <div class="action-buttons">
        <WelcomeButtonSecondary class="btn ghost action-btn" @click="onMoreInfoClick" />
        <WelcomeButtonPrimary @click="navigateToAuth" class="btn action action-btn"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 70px - 50px - 2rem);
  gap: 0;
  padding: 40px 0;
}

.visual-container {
  flex: 1;
  display: flex;
  justify-content: center;
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
  color: var(--text);
  font-family: var(--display-font), sans-serif;
}

.example-badge {
  color: var(--sub);
  padding: 0;
  font-family: var(--normal-font), sans-serif;
  font-size: var(--font-size-body);
}

.example-body {
  margin-top: 8px;
  color: var(--text);
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-family: var(--normal-font), sans-serif;
  font-size: 16px;
}

.item-card-vanishing {
  background:linear-gradient(var(--vlbg) 0%, transparent 100%);
  border-radius: var(--border-7) var(--border-7) 0 0;
  min-height: 30px;
}

.item-card-vanishing::before {
  content: "";
  border-radius: var(--border-7) var(--border-7) 0 0;
  min-height: 30px;
  display: flex;
  border: 1px solid transparent;
  background: linear-gradient(var(--gg) 0%, transparent 100%) border-box;
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
  color: var(--text);
}

.headline {
  font-size: 7rem;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
  text-align: right;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  margin-top: 0;
  color: var(--sub);
  text-align: right;
}


.free {
  font-weight: 600;
  color: var(--text);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 30px;
  justify-content: flex-end;
}

.action-btn {
  padding: 10px 16px;
  border-radius: var(--border-4);
  font-size: var(--font-size-body);
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .welcome-section {
    flex-direction: column;
    padding: 0;
    min-height: auto;
  }

  .text-content {
    max-width: 100%;
    order: 2;
  }

  .visual-container {
    order: 1;
  }

  .headline {
    font-size: 100px;
    text-align: Left;
  }

  .subline {
    font-size: 1.4rem;
    text-align: left;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .only-desktop {
    display: none;
  }

  .headline {
    margin-top: -24px;
    font-size: 75px;
  }

  .action-buttons {
    flex-direction: row;
    gap: 8px;
  }
}

@media (max-width: 368px) {
  .headline {
    font-size: 65px;
  }
}

@media (max-width: 324px) {
  .headline {
    font-size: 60px
  }
}

@media (max-width: 300px) {
  .headline {
    font-size: 50px
  }
}

</style>