<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Skull, RefreshCw, Crosshair, Settings } from 'lucide-vue-next';

// Constants
const TOTAL_CHAMBERS = 6;

// State
const spinAfterShot = ref(false); // Die Chancen steigen mit jedem Schuss (Default)
const showSettings = ref(false);

const status = ref<'idle' | 'playing' | 'dead'>('playing');
const shotsFired = ref(0);
const bulletIndex = ref(0);
const currentIndex = ref(0);
const isProcessing = ref(false);

// Computed Properties
const oddsDisplay = computed(() => {
  if (status.value === 'dead') return '0 / 6';
  if (spinAfterShot.value) {
    return '1 / 6';
  } else {
    return `1 / ${TOTAL_CHAMBERS - shotsFired.value}`;
  }
});

const probabilityPercentage = computed(() => {
  if (status.value === 'dead') return 100;
  if (spinAfterShot.value) return (1 / 6) * 100;
  return (1 / (TOTAL_CHAMBERS - shotsFired.value)) * 100;
});

const gameStatusText = computed(() => {
  if (status.value === 'dead') return 'Du bist gestorben.';
  if (probabilityPercentage.value >= 100) return 'Letzte Patrone...!';
  if (shotsFired.value > 0) return 'Gut gegangen. Weiter?';
  return 'Deine Chancen stehen ' + oddsDisplay.value;
});

function initGame() {
  status.value = 'playing';
  shotsFired.value = 0;
  currentIndex.value = 0;
  bulletIndex.value = Math.floor(Math.random() * TOTAL_CHAMBERS);
}

// Watch settings change to prevent logic issues mid-game
watch(spinAfterShot, () => {
  initGame();
});

function pullTrigger() {
  if (status.value !== 'playing' || isProcessing.value) return;
  
  isProcessing.value = true;
  
  // Fake delay for suspense
  setTimeout(() => {
    isProcessing.value = false;
    
    let simulatedIndex = currentIndex.value;
    if (spinAfterShot.value) {
      simulatedIndex = Math.floor(Math.random() * TOTAL_CHAMBERS);
    }
    
    if (simulatedIndex === bulletIndex.value) {
      status.value = 'dead';
      if (spinAfterShot.value) currentIndex.value = simulatedIndex;
    } else {
      shotsFired.value++;
      if (spinAfterShot.value) {
         currentIndex.value = simulatedIndex;
      } else {
         currentIndex.value++;
      }
    }
  }, 400); 
}

// Initialize on mount
initGame();
</script>

<template>
  <div class="bout px-4">
    <div class="card max-w-lg w-full flex flex-col items-center p-8 relative overflow-hidden shadow-2xl transition-all duration-300 transform group hover:-translate-y-1 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-canvas)]">
      
      <!-- Background glow when dead -->
      <div 
        class="absolute inset-0 z-0 transition-all duration-700 pointer-events-none"
        :class="status === 'dead' ? 'bg-[var(--danger)] opacity-10' : 'opacity-0'"
      ></div>

      <div class="relative z-10 w-full flex flex-col items-center">
        <!-- Header & Settings Toggle -->
        <div class="w-full flex justify-between items-center mb-6">
          <h1 class="text-2xl font-[var(--display-font)] m-0 font-bold tracking-wider">ROULETTE</h1>
          <button @click="showSettings = !showSettings" class="btn ghost p-2 hover:bg-[var(--bg-interactive-hover)] rounded-md transition-colors" title="Einstellungen">
            <Settings class="w-5 h-5" />
          </button>
        </div>

        <!-- Settings Panel -->
        <transition name="slide-fade">
          <div v-if="showSettings" class="w-full bg-[var(--bg-surface)] rounded-xl p-4 mb-6 border border-[var(--border-surface)] shadow-inner">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-[var(--text-default)] m-0 mb-1">Zylinder drehen</p>
                <p class="text-xs text-[var(--text-muted)] m-0">Nach jedem Schuss neu mischen. Chancen bleiben 1:6.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                <input type="checkbox" v-model="spinAfterShot" class="sr-only peer">
                <div class="w-11 h-6 bg-[var(--border-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>
          </div>
        </transition>

        <!-- Main Display -->
        <div class="flex flex-col items-center my-6">
          <div 
            class="mb-6 transition-all duration-500 ease-out"
            :class="{
              'scale-125 text-[var(--danger)] drop-shadow-[0_0_15px_rgba(246,82,82,0.6)]': status === 'dead',
              'text-[var(--text-default)]': status === 'playing',
              'animate-spin': isProcessing && spinAfterShot
            }"
          >
            <Skull v-if="status === 'dead'" class="w-24 h-24" />
            <Crosshair v-else class="w-24 h-24" />
          </div>

          <div class="text-center">
            <h2 class="text-4xl font-extrabold mb-1 tracking-tight" :class="status === 'dead' ? 'text-[var(--danger)]' : 'text-[var(--text-default)]'">
              {{ oddsDisplay }}
            </h2>
            <p v-if="status === 'playing'" class="text-sm font-medium mt-2" :class="probabilityPercentage >= 50 ? 'text-[var(--danger)] animate-pulse' : 'text-[var(--text-muted)]'">
              Todeschance: {{ Math.round(probabilityPercentage) }}%
            </p>
            <p class="text-lg font-semibold mt-4 mb-0" :class="status === 'dead' ? 'text-[var(--danger)]' : 'text-[var(--text-default)]'">
              {{ gameStatusText }}
            </p>
            <p v-if="shotsFired > 0 && status === 'playing'" class="text-xs text-[var(--text-muted)] mt-1">
              {{ shotsFired }}x abgedrückt
            </p>
          </div>
        </div>

        <!-- Chamber Visualizer -->
        <div class="flex gap-2 justify-center mb-10 w-full mt-2">
          <div 
            v-for="i in TOTAL_CHAMBERS" 
            :key="i" 
            class="w-8 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300"
            :class="{
              'bg-[var(--danger-background)] border-[var(--danger)] scale-110 shadow-[0_0_10px_var(--danger)]': status === 'dead' && i === currentIndex + 1,
              'bg-transparent border-[var(--border-canvas)] opacity-20': !spinAfterShot && i <= currentIndex && status === 'playing',
              'bg-transparent border-[var(--danger)] opacity-20': !spinAfterShot && i <= currentIndex && status === 'dead' && i !== currentIndex + 1,
              'bg-[var(--text-default)] border-[var(--text-default)]': (spinAfterShot || i > currentIndex) && !(status === 'dead' && i === currentIndex + 1),
              'shadow-[0_0_10px_var(--text-default)] scale-110': isProcessing && !spinAfterShot && i === currentIndex + 1,
              'opacity-50 animate-pulse': isProcessing && spinAfterShot
            }"
          >
          </div>
        </div>

        <!-- Controls -->
        <div class="flex gap-4 w-full justify-center flex-wrap">
          <button 
            v-if="status === 'playing'"
            @click="pullTrigger" 
            :disabled="isProcessing"
            class="btn action flex-1 py-4 text-xl flex items-center justify-center font-bold tracking-wide rounded-xl transition-all"
            :class="{ 'opacity-70 scale-95 cursor-not-allowed': isProcessing, 'hover:scale-105 active:scale-95': !isProcessing }"
          >
            <Crosshair class="w-6 h-6 mr-2" :class="{'animate-spin': isProcessing && spinAfterShot}" />
            {{ isProcessing ? '...' : 'Abdrücken' }}
          </button>

          <button 
            v-if="status === 'dead' || shotsFired > 0"
            @click="initGame" 
            class="btn ghost px-6 py-4 text-lg font-semibold rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            :class="{'w-full': status === 'dead'}"
          >
            <RefreshCw class="w-5 h-5 mr-2" />
            Neu laden
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.bout {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  margin-top: 2rem;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>