<script setup lang="ts">
import { ref, computed } from 'vue';
import { Zap, Clock, AlertTriangle, MoreHorizontal } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'finish', score: number): void;
}>();

type TestState = 'idle' | 'waiting' | 'ready' | 'too-early' | 'result';

const state = ref<TestState>('idle');
const startTime = ref(0);
const reactionTime = ref(0);
let timeoutId: number | null = null;

const titleText = computed(() => {
  switch (state.value) {
    case 'idle': return 'Reaktionszeit';
    case 'waiting': return 'Warten auf Grün...';
    case 'ready': return 'Klick!';
    case 'too-early': return 'Zu früh!';
    case 'result': return `${reactionTime.value} ms`;
  }
});

const descText = computed(() => {
  switch (state.value) {
    case 'idle': return 'Klicke irgendwo, um zu starten.';
    case 'waiting': return 'Klicke, sobald der Hintergrund grün wird.';
    case 'ready': return 'Schnell!';
    case 'too-early': return 'Du hast zu früh geklickt. Klicke, um es erneut zu versuchen.';
    case 'result': return 'Das ist deine Reaktionszeit.';
  }
});

function handleClick() {
  if (state.value === 'idle') {
    startWait();
  } else if (state.value === 'waiting') {
    if (timeoutId) clearTimeout(timeoutId);
    state.value = 'too-early';
  } else if (state.value === 'ready') {
    reactionTime.value = Date.now() - startTime.value;
    state.value = 'result';
  } else if (state.value === 'too-early') {
    startWait();
  }
}

function startWait() {
  state.value = 'waiting';
  const delay = Math.floor(Math.random() * 3000) + 2000; // 2000 - 5000ms
  timeoutId = window.setTimeout(() => {
    state.value = 'ready';
    startTime.value = Date.now();
  }, delay);
}

function reset() {
  state.value = 'idle';
  reactionTime.value = 0;
}

function saveAndExit() {
  emit('finish', reactionTime.value);
}
</script>

<template>
  <div class="reaction-test" :class="state" @mousedown.prevent="handleClick" @touchstart.prevent="handleClick">
    <div class="content">
      <div v-if="state === 'idle'" class="icon-container">
        <Zap :size="64" />
      </div>
      <div v-if="state === 'waiting'" class="icon-container">
        <MoreHorizontal :size="64" />
      </div>
      <div v-if="state === 'ready'" class="icon-container">
        <Zap :size="64" />
      </div>
      <div v-if="state === 'too-early'" class="icon-container">
        <AlertTriangle :size="64" />
      </div>
      <div v-if="state === 'result'" class="icon-container">
        <Clock :size="64" />
      </div>

      <h2 class="state-title">{{ titleText }}</h2>
      <p class="state-desc">{{ descText }}</p>

      <div v-if="state === 'result'" class="actions">
        <BaseButton class="test-btn primary" @click.stop="saveAndExit">Speichern & Beenden</BaseButton>
        <BaseButton class="test-btn secondary" @click.stop="reset">Nochmal</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reaction-test {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.1s;
  text-align: center;
  color: white;
}

.reaction-test.idle { background-color: #2b87d1; }
.reaction-test.waiting { background-color: #ce2636; }
.reaction-test.ready { background-color: #4bdb6a; }
.reaction-test.too-early { background-color: #ce2636; }
.reaction-test.result { background-color: #2b87d1; }

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.reaction-test.result .content {
  pointer-events: auto;
}

.icon-container {
  margin-bottom: 24px;
}

.state-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 12px;
  line-height: 1;
}

.state-desc {
  font-size: 1.5rem;
  opacity: 0.9;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 16px;
  margin-top: 40px;
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
