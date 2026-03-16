<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Trophy } from 'lucide-vue-next';
import { useBrainTests } from '../composables/useBrainTests';

const route = useRoute();
const { brainTests, getScore, saveScore } = useBrainTests();

const testId = computed(() => route.params.testId as string);

const currentTest = computed(() => {
  return brainTests.find(t => t.id === testId.value);
});

const highscore = computed(() => {
  if (!currentTest.value) return null;
  return getScore(currentTest.value.id);
});

const ReactionTimeTest = defineAsyncComponent(() => import('../components/ReactionTimeTest.vue'));
const NumberMemoryTest = defineAsyncComponent(() => import('../components/NumberMemoryTest.vue'));
const VisualMemoryTest = defineAsyncComponent(() => import('../components/VisualMemoryTest.vue'));

const testComponent = computed(() => {
  if (testId.value === 'reaction-time') return ReactionTimeTest;
  if (testId.value === 'number-memory') return NumberMemoryTest;
  if (testId.value === 'visual-memory') return VisualMemoryTest;
  return null;
});

function onTestFinish(score: number) {
  saveScore(testId.value, score);
}
</script>

<template>
  <div class="brain-test-view">
    <div class="test-header">
      <router-link to="/brain" class="back-btn">
        <ArrowLeft :size="20" />
        <span>Zurück zur Übersicht</span>
      </router-link>
      <div class="test-info" v-if="currentTest">
        <h1 class="test-title">{{ currentTest.title }}</h1>
        <div class="highscore-badge" v-if="highscore !== null" :style="{ '--badge-color': currentTest.color }">
          <Trophy :size="16" />
          <span>Highscore: {{ highscore }} {{ currentTest.unit }}</span>
        </div>
      </div>
    </div>

    <div class="test-container" v-if="currentTest">
      <transition name="fade" mode="out-in">
        <component
            :is="testComponent"
            :key="currentTest.id"
            @finish="onTestFinish"
        />
      </transition>
    </div>
    
    <div class="not-found" v-else>
      <h2>Test nicht gefunden</h2>
      <p>Der angeforderte Test existiert nicht.</p>
      <router-link to="/brain" class="btn action">Zurück</router-link>
    </div>
  </div>
</template>

<style scoped>
.brain-test-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px 20px;
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
}

.test-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.2s ease;
  align-self: flex-start;
}

.back-btn:hover {
  color: var(--text-default);
}

.test-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.test-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.01em;
}

.highscore-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, var(--badge-color) 15%, transparent);
  color: var(--badge-color);
  padding: 8px 16px;
  border-radius: 100px;
  font-weight: 700;
  font-size: 0.95rem;
}

.test-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-canvas);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: var(--menu-shadow);
  position: relative;
  min-height: 400px;
}

.not-found {
  text-align: center;
  padding: 60px 20px;
}

.not-found h2 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.not-found p {
  color: var(--text-muted);
  margin-bottom: 24px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .test-info {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>