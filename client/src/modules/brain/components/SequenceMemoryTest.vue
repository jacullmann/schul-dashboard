<script setup lang="ts">
import { ref, computed } from 'vue';
import { Layers, AlertTriangle } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'finish', score: number): void;
}>();

type TestState = 'idle' | 'showing' | 'waiting_input' | 'wrong' | 'result';

const state = ref<TestState>('idle');
const level = ref(1);
const sequence = ref<number[]>([]);
const playerSequence = ref<number[]>([]);
const activeSquare = ref<number | null>(null);

const grid = [0, 1, 2, 3, 4, 5, 6, 7, 8];

async function startGame() {
  level.value = 1;
  sequence.value = [];
  nextLevel();
}

async function nextLevel() {
  state.value = 'showing';
  playerSequence.value = [];
  sequence.value.push(Math.floor(Math.random() * 9));
  
  await new Promise(r => setTimeout(r, 500));
  
  for (const index of sequence.value) {
    activeSquare.value = index;
    await new Promise(r => setTimeout(r, 500));
    activeSquare.value = null;
    await new Promise(r => setTimeout(r, 200));
  }
  
  state.value = 'waiting_input';
}

function handleSquareClick(index: number) {
  if (state.value !== 'waiting_input') return;
  
  playerSequence.value.push(index);
  
  const currentIndex = playerSequence.value.length - 1;
  
  if (playerSequence.value[currentIndex] !== sequence.value[currentIndex]) {
    state.value = 'wrong';
    setTimeout(() => {
      state.value = 'result';
    }, 1500);
  } else if (playerSequence.value.length === sequence.value.length) {
    level.value++;
    setTimeout(nextLevel, 500);
  }
}

function reset() {
  state.value = 'idle';
}

function saveAndExit() {
  emit('finish', level.value - 1);
}
</script>

<template>
  <div class="sequence-test" :class="state">
    <div v-if="state === 'idle'" class="start-screen">
      <Layers :size="64" class="icon" />
      <h2>Sequenzgedächtnis</h2>
      <p>Merke dir das Muster der aufleuchtenden Felder.</p>
      <button class="btn test-btn primary" @click="startGame">Starten</button>
    </div>

    <div v-else-if="['showing', 'waiting_input', 'wrong'].includes(state)" class="game-screen">
      <div class="level-counter">Level: {{ level }}</div>
      
      <div class="grid">
        <div 
          v-for="i in grid" 
          :key="i"
          class="square"
          :class="{ active: activeSquare === i || (state === 'waiting_input' && false) }"
          @click="handleSquareClick(i)"
        ></div>
      </div>
      
      <div v-if="state === 'wrong'" class="wrong-overlay">
        <AlertTriangle :size="64" />
        <h2>Falsch!</h2>
      </div>
    </div>

    <div v-else-if="state === 'result'" class="result-screen">
      <Layers :size="64" class="icon" />
      <h2>Sequenzgedächtnis</h2>
      <p>Du hast es bis Level {{ level }} geschafft.</p>
      <p class="score">Level {{ level - 1 }}</p>
      <div class="actions">
        <button class="btn test-btn primary" @click="saveAndExit">Speichern & Beenden</button>
        <button class="btn test-btn secondary" @click="reset">Nochmal</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sequence-test {
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

.sequence-test.wrong { background-color: #ce2636; }

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
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.level-counter {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 40px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-gap: 15px;
}

.square {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.sequence-test.waiting_input .square:hover {
  background: rgba(255, 255, 255, 0.4);
}

.square.active {
  background: white;
  transform: scale(1.02);
}

.wrong-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(206, 38, 54, 0.9);
  border-radius: 20px;
  z-index: 10;
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