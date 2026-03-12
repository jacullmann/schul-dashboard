<script setup lang="ts">
import { Brain, Zap, Eye } from 'lucide-vue-next';
import { useBrainTests } from '../composables/useBrainTests';

const { brainTests, getScore } = useBrainTests();

const iconMap = {
  Brain,
  Zap,
  Eye
};

function getIcon(name: string) {
  return (iconMap as any)[name] || Brain;
}
</script>

<template>
  <div class="brain-library">
    <div class="header-section">
      <h1 class="title">Gehirntraining</h1>
      <p class="subtitle">Teste und verbessere deine mentalen Fähigkeiten mit unseren wissenschaftlich inspirierten Tests.</p>
    </div>

    <div class="test-grid">
      <router-link
          v-for="test in brainTests"
          :key="test.id"
          :to="`/brain/${test.id}`"
          class="test-card"
          :style="{ '--test-color': test.color }"
      >
        <div class="card-glow"></div>
        <div class="card-content">
          <div class="icon-wrapper">
            <component :is="getIcon(test.icon)" :size="32" stroke-width="1.5" />
          </div>
          <div class="text-content">
            <h2 class="test-title">{{ test.title }}</h2>
            <p class="test-desc">{{ test.description }}</p>
          </div>

          <div class="score-section" v-if="getScore(test.id) !== null">
            <span class="score-label">Highscore</span>
            <span class="score-value">{{ getScore(test.id) }} {{ test.unit }}</span>
          </div>
          <div class="score-section no-score" v-else>
            <span class="score-label">Noch nicht gespielt</span>
            <span class="score-value">-</span>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.brain-library {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  animation: fadeIn 0.4s ease-out;
}

.header-section {
  text-align: center;
  margin-bottom: 60px;
}

.title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--text) 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--text);
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.test-card {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px;
  text-decoration: none;
  color: var(--text);
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
  display: flex;
}

.test-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top right, var(--test-color) 0%, transparent 60%);
  opacity: 0.05;
  transition: opacity 0.4s ease;
  z-index: 0;
}

.test-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px -10px var(--test-color);
  border-color: transparent;
}

.test-card:hover .card-glow {
  opacity: 0.15;
}

.test-card:hover .icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  background: var(--test-color);
  color: #fff;
  box-shadow: 0 8px 20px -5px var(--test-color);
}

.card-content {
  position: relative;
  z-index: 1;
  background: var(--bg);
  border-radius: 18px;
  padding: 28px;
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--bg-surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--test-color);
  margin-bottom: 24px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.text-content {
  flex-grow: 1;
}

.test-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.test-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 24px;
}

.score-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

.score-label {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.score-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.no-score .score-value {
  color: var(--text-muted);
  font-weight: 500;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .test-grid {
    grid-template-columns: 1fr;
  }
}
</style>