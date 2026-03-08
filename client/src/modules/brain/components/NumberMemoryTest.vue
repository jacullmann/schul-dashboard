<template>
  <div class="test-wrapper number-memory-test">
    <div v-if="state !== 'result'" class="full-height flex-center">
      
      <div v-if="state === 'idle'" class="center-content text-center">
         <div class="icon-wrap"><Brain :size="64" /></div>
         <h1 class="test-heading">Zahlen merken</h1>
         <p class="test-sub">Merk dir die Zahl, die gleich auf dem Bildschirm erscheint.</p>
         <button class="btn action cta-large mt-4" @click="startLevel()">Start</button>
      </div>

      <div v-if="state === 'showing'" class="center-content showing-content text-center">
         <div class="number-display">{{ currentNumber }}</div>
         <div class="progress-bar-container">
            <div class="progress-bar" :style="{ animationDuration: showingTime + 'ms' }"></div>
         </div>
      </div>

      <div v-if="state === 'input'" class="center-content input-content text-center">
         <h2 class="test-heading-sm">Wie lautete die Zahl?</h2>
         <p class="test-sub">Level {{ level }}</p>
         <form @submit.prevent="checkAnswer" class="input-form">
           <input 
             ref="inputRef"
             v-model="userInput" 
             type="number" 
             class="number-input input" 
             placeholder="Zahl eingeben..."
             autofocus
           />
           <button type="submit" class="btn action cta-large w-full mt-3">Prüfen</button>
         </form>
      </div>

      <div v-if="state === 'feedback'" class="center-content feedback-content text-center">
          <div v-if="isCorrect">
            <h2 class="correct-text test-heading-sm">Richtig!</h2>
            <p class="test-sub">Die Zahl war {{ currentNumber }}.</p>
            <button class="btn action cta-large mt-4" @click="nextLevel()">Nächstes Level</button>
          </div>
          <div v-else>
            <h2 class="wrong-text test-heading-sm">Falsch</h2>
            <p class="test-sub">Die richtige Zahl war <strong>{{ currentNumber }}</strong>.</p>
            <p class="test-sub">Deine Eingabe war <strong class="wrong-color">{{ userInput }}</strong>.</p>
            <button class="btn action cta-large mt-4" @click="endGame()">Weiter</button>
          </div>
      </div>

    </div>

    <div v-if="state === 'result'" class="center-content result-content text-center full-height flex-center">
        <div class="icon-wrap"><Brain :size="64" /></div>
        <h2 class="test-heading">Level {{ level - 1 }} erreicht!</h2>
        <p class="test-sub">Du konntest dir eine {{ level - 1 }}-stellige Zahl merken.</p>
        <div class="actions mt-4">
            <button class="btn action cta-large" @click="saveAndExit">Speichern & Beenden</button>
            <button class="btn secondary back-btn-sec" @click="reset">Nochmal probieren</button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { Brain } from 'lucide-vue-next';

const emit = defineEmits<{ (e: 'finish', score: number): void; }>();

type State = 'idle' | 'showing' | 'input' | 'feedback' | 'result';

const state = ref<State>('idle');
const level = ref(1);
const currentNumber = ref('');
const userInput = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const showingTime = computed(() => {
    return 1000 + (level.value * 800);
});

const isCorrect = computed(() => {
    return userInput.value === currentNumber.value;
});

function generateNumber(length: number) {
    let result = '';
    for(let i = 0; i < length; i++) {
        if (i === 0) {
            result += Math.floor(Math.random() * 9) + 1;
        } else {
            result += Math.floor(Math.random() * 10);
        }
    }
    return result;
}

function startLevel() {
    state.value = 'showing';
    userInput.value = '';
    currentNumber.value = generateNumber(level.value);
    
    setTimeout(() => {
        state.value = 'input';
        nextTick(() => {
            if (inputRef.value) inputRef.value.focus();
        });
    }, showingTime.value);
}

function checkAnswer() {
    if (!userInput.value) return;
    state.value = 'feedback';
}

function nextLevel() {
    level.value++;
    startLevel();
}

function endGame() {
    state.value = 'result';
}

function reset() {
    level.value = 1;
    state.value = 'idle';
}

function saveAndExit() {
    emit('finish', Math.max(0, level.value - 1));
}
</script>

<style scoped>
.test-wrapper {
  position: absolute;
  inset: 0;
  background-color: var(--bg-surface);
  color: var(--text);
  padding: 40px 20px;
}

.full-height {
  height: 100%;
}

.flex-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.center-content {
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
}

.text-center {
  text-align: center;
}

.icon-wrap {
  color: var(--primary);
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.test-heading {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 16px;
}

.test-heading-sm {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.test-sub {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.mt-3 { margin-top: 16px; }
.mt-4 { margin-top: 32px; }
.w-full { width: 100%; }

.number-display {
  font-size: 6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text);
  margin-bottom: 40px;
  word-break: break-all;
  line-height: 1.1;
}

.progress-bar-container {
  height: 6px;
  width: 100%;
  background: var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  width: 100%;
  animation-name: shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}

.number-input {
  width: 100%;
  font-size: 2rem;
  text-align: center;
  margin-top: 24px;
  padding: 16px;
  background: var(--bg);
}

.correct-text {
  color: var(--success);
}

.wrong-text {
  color: var(--error);
}

.wrong-color {
  color: var(--error);
  text-decoration: line-through;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.back-btn-sec {
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 12px 24px;
  border-radius: var(--radius, 12px);
  font-weight: 600;
  color: var(--text);
}
</style>
