<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue';
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
    return String(userInput.value).trim() === String(currentNumber.value).trim();
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

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        if (state.value === 'idle') {
            startLevel();
        } else if (state.value === 'feedback') {
            if (isCorrect.value) nextLevel();
            else endGame();
        }
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="test-wrapper number-memory-test">
    <div v-if="state !== 'result'" class="full-height flex-center">
      
      <div v-if="state === 'idle'" class="center-content text-center">
         <div class="icon-wrap"><Brain :size="64" /></div>
         <h1 class="test-heading">Zahlen merken</h1>
         <p class="test-sub">Merk dir die Zahl, die gleich auf dem Bildschirm erscheint.</p>
         <button class="btn test-btn primary mt-4" @click="startLevel()">Start</button>
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
             type="text" 
             inputmode="numeric"
             pattern="[0-9]*"
             class="number-input input" 
             placeholder="Zahl eingeben..."
             autofocus
           />
           <button type="submit" class="btn test-btn primary w-full mt-3">Prüfen</button>
         </form>
      </div>

      <div v-if="state === 'feedback'" class="center-content feedback-content text-center">
          <div v-if="isCorrect">
            <h2 class="correct-text test-heading-sm">Richtig!</h2>
            <p class="test-sub">Die Zahl war {{ currentNumber }}.</p>
            <button class="btn test-btn primary mt-4" @click="nextLevel()">Nächstes Level</button>
          </div>
          <div v-else>
            <h2 class="wrong-text test-heading-sm">Falsch</h2>
            <p class="test-sub">Die richtige Zahl war <strong>{{ currentNumber }}</strong>.</p>
            <p class="test-sub">Deine Eingabe war <strong class="wrong-color">{{ userInput }}</strong>.</p>
            <button class="btn test-btn primary mt-4" @click="endGame()">Weiter</button>
          </div>
      </div>

    </div>

    <div v-if="state === 'result'" class="center-content result-content text-center full-height flex-center">
        <div class="icon-wrap"><Brain :size="64" /></div>
        <h2 class="test-heading">Level {{ level - 1 }} erreicht!</h2>
        <p class="test-sub">Du konntest dir eine {{ level - 1 }}-stellige Zahl merken.</p>
        <div class="actions mt-4">
            <button class="btn test-btn primary" @click="saveAndExit">Speichern & Beenden</button>
            <button class="btn test-btn secondary" @click="reset">Nochmal probieren</button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.test-wrapper {
  position: absolute;
  inset: 0;
  background-color: #2b87d1;
  color: white;
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
  color: white;
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
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

.mt-3 { margin-top: 16px; }
.mt-4 { margin-top: 32px; }
.w-full { width: 100%; }

.number-display {
  font-size: 6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: white;
  margin-bottom: 40px;
  word-break: break-all;
  line-height: 1.1;
}

.progress-bar-container {
  height: 6px;
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: white;
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
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  outline: none;
}

.number-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.number-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.correct-text {
  color: #4bdb6a;
}

.wrong-text {
  color: #ce2636;
}

.wrong-color {
  color: #ce2636;
  text-decoration: line-through;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
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