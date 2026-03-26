<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { Keyboard, Clock } from '@lucide/vue';

const emit = defineEmits<{
  (e: 'finish', score: number): void;
}>();

const sampleText = "Programmieren ist die Kunst, einem Computer zu erklären, was er tun soll. Es erfordert logisches Denken, Kreativität und viel Geduld. Eine gute Software löst Probleme, anstatt neue zu schaffen. Die besten Entwickler schreiben Code, der nicht nur funktioniert, sondern auch von anderen leicht gelesen und verstanden werden kann.";
const characters = sampleText.split('');

type TestState = 'idle' | 'playing' | 'result';
const state = ref<TestState>('idle');

const typedText = ref('');
const startTime = ref(0);
const endTime = ref(0);


const wpm = computed(() => {
  if (typedText.value.length === 0) return 0;
  const end = endTime.value || Date.now();
  const timeInMinutes = Math.max((end - startTime.value) / 1000 / 60, 0.0001);
  const wordsTyped = typedText.value.length / 5; // standard WPM calculation
  return Math.round(wordsTyped / timeInMinutes);
});

function handleKeydown(e: KeyboardEvent) {
  if (state.value !== 'playing') return;

  if (e.key === ' ' || e.key === 'Backspace') {
    e.preventDefault();
  }

  if (e.key === 'Backspace') {
    typedText.value = typedText.value.slice(0, -1);
  } else if (e.key.length === 1) { // Normal character
    if (!startTime.value) startTime.value = Date.now();
    
    // Only allow typing if it matches or if we haven't reached the end
    if (typedText.value.length < characters.length) {
      typedText.value += e.key;
    }
    
    if (typedText.value === sampleText) {
      endTime.value = Date.now();
      state.value = 'result';
    }
  }
}

function startGame() {
  state.value = 'playing';
  typedText.value = '';
  startTime.value = 0;
  endTime.value = 0;
}

function reset() {
  state.value = 'idle';
  typedText.value = '';
}

function saveAndExit() {
  emit('finish', wpm.value);
}

useEventListener(window, 'keydown', handleKeydown);

function getCharClass(index: number) {
  if (index >= typedText.value.length) return 'untyped';
  if (typedText.value[index] === characters[index]) return 'correct';
  return 'incorrect';
}
</script>

<template>
  <div class="typing-test" :class="state">
    <div v-if="state === 'idle'" class="start-screen">
      <Keyboard :size="64" class="icon" />
      <h2>Schreibgeschwindigkeit</h2>
      <p>Tippe den vorgegebenen Text so schnell und fehlerfrei wie möglich ab.</p>
      <BaseButton class="test-btn primary" @click="startGame">Starten</BaseButton>
    </div>

    <div v-else-if="state === 'playing'" class="game-screen">
      <div class="text-display">
        <span 
          v-for="(char, index) in characters" 
          :key="index"
          :class="['char', getCharClass(index), { cursor: index === typedText.length }]"
        >{{ char }}</span>
      </div>
      <p class="hint">Tippe einfach los. Fehler werden rot markiert, drücke Backspace zum Korrigieren.</p>
    </div>

    <div v-else-if="state === 'result'" class="result-screen">
      <Clock :size="64" class="icon" />
      <h2>Ergebnis</h2>
      <p class="score">{{ wpm }} WPM</p>
      <div class="actions">
        <BaseButton class="test-btn primary" @click="saveAndExit">Speichern & Beenden</BaseButton>
        <BaseButton class="test-btn secondary" @click="reset">Nochmal</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.typing-test {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b87d1;
  color: white;
  text-align: center;
  padding: 40px;
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
  max-width: 800px;
  width: 100%;
}

.text-display {
  font-size: 1.8rem;
  line-height: 1.6;
  text-align: left;
  background: rgba(0, 0, 0, 0.2);
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 20px;
  font-family: monospace;
  white-space: pre-wrap;
}

.char {
  position: relative;
}

.char.untyped {
  opacity: 0.5;
}

.char.correct {
  color: #4bdb6a;
  opacity: 1;
}

.char.incorrect {
  color: #ce2636;
  background: rgba(206, 38, 54, 0.3);
  border-radius: 2px;
}

.char.cursor::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 3px;
  background-color: white;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.hint {
  font-size: 1rem;
  opacity: 0.7;
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