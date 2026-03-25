<script setup lang="ts">
import { ref, computed } from 'vue';
import { Target, Clock } from '@lucide/vue';

const emit = defineEmits<{
  (e: 'finish', score: number): void;
}>();

const TARGETS_TOTAL = 30;

type TestState = 'idle' | 'playing' | 'result';
const state = ref<TestState>('idle');
const targetsHit = ref(0);
const startTime = ref(0);
const endTime = ref(0);

const targetPosition = ref({ x: 50, y: 50 });

const averageTime = computed(() => {
  if (targetsHit.value === 0) return 0;
  return Math.round((endTime.value - startTime.value) / TARGETS_TOTAL);
});

function startGame() {
  state.value = 'playing';
  targetsHit.value = 0;
  startTime.value = Date.now();
  moveTarget();
}

function hitTarget() {
  if (state.value !== 'playing') return;
  targetsHit.value++;
  if (targetsHit.value >= TARGETS_TOTAL) {
    endTime.value = Date.now();
    state.value = 'result';
  } else {
    moveTarget();
  }
}

function moveTarget() {
  targetPosition.value = {
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80
  };
}

function reset() {
  state.value = 'idle';
  targetsHit.value = 0;
}

function saveAndExit() {
  emit('finish', averageTime.value);
}
</script>

<template>
  <div class="aim-test" :class="state">
    <div v-if="state === 'idle'" class="start-screen">
      <Target :size="64" class="icon" />
      <h2>Aim Trainer</h2>
      <p>Klicke auf 30 Zielscheiben so schnell du kannst.</p>
      <BaseButton class="test-btn primary" @click="startGame">Starten</BaseButton>
    </div>

    <div v-else-if="state === 'playing'" class="game-screen" @mousedown.prevent>
      <div class="target-counter">Ziele: {{ targetsHit }} / {{ TARGETS_TOTAL }}</div>
      <div class="target-area">
        <div
            class="target"
            :style="{ left: `${targetPosition.x}%`, top: `${targetPosition.y}%` }"
            @mousedown="hitTarget"
        >
          <div class="target-inner"></div>
        </div>
      </div>
    </div>

    <div v-else-if="state === 'result'" class="result-screen">
      <Clock :size="64" class="icon" />
      <h2>Durchschnittszeit</h2>
      <p class="score">{{ averageTime }} ms</p>
      <div class="actions">
        <BaseButton class="test-btn primary" @click="saveAndExit">Speichern & Beenden</BaseButton>
        <BaseButton class="test-btn secondary" @click="reset">Nochmal</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aim-test {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b87d1;
  color: white;
  text-align: center;
  user-select: none;
}

.start-screen, .result-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon {
  margin-bottom: 20px;
}

h2 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 12px;
}

p {
  font-size: 1.5rem;
  opacity: 0.9;
  margin-bottom: 30px;
}

.score {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 40px;
}

.game-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.target-counter {
  padding: 20px;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
}

.target-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.target {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: white;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.target-inner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffaa00;
}

.actions {
  display: flex;
  gap: 16px;
}

.test-btn {
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
  text-decoration: none;
}

.test-btn:hover {
  transform: scale(1.05);
}

.test-btn.primary {
  background: white;
  color: #2b87d1;
}

.test-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
</style>