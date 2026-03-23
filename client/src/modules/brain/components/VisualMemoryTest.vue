<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Eye, Heart } from 'lucide-vue-next';

const emit = defineEmits<{ (e: 'finish', score: number): void; }>();

type State = 'idle' | 'showing' | 'input' | 'feedback' | 'result';

const state = ref<State>('idle');
const level = ref(1);
const lives = ref(3);

const activeTiles = ref<number[]>([]);
const revealedTiles = ref<number[]>([]);
const wrongTiles = ref<number[]>([]);

const gridSize = computed(() => {
    if (level.value <= 2) return 3;
    if (level.value <= 5) return 4;
    return 5;
});

const totalTiles = computed(() => gridSize.value * gridSize.value);
const numActiveTiles = computed(() => level.value + 2);

const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${gridSize.value}, 1fr)`,
    gridTemplateRows: `repeat(${gridSize.value}, 1fr)`
}));

function startLevel() {
    activeTiles.value = [];
    revealedTiles.value = [];
    wrongTiles.value = [];
    
    // Pick unique tiles
    const candidates = Array.from({ length: totalTiles.value }, (_, i) => i + 1);
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = candidates[i]!;
        candidates[i] = candidates[j]!;
        candidates[j] = temp;
    }
    
    activeTiles.value = candidates.slice(0, numActiveTiles.value);
    
    state.value = 'showing';
    
    setTimeout(() => {
        state.value = 'input';
    }, 1500 + (level.value * 200));
}

function handleTileClick(index: number) {
    if (state.value !== 'input') return;
    if (revealedTiles.value.includes(index) || wrongTiles.value.includes(index)) return;
    
    if (activeTiles.value.includes(index)) {
        revealedTiles.value.push(index);
        
        if (revealedTiles.value.length === activeTiles.value.length) {
            state.value = 'feedback';
            setTimeout(() => {
                level.value++;
                startLevel();
            }, 1000);
        }
    } else {
        wrongTiles.value.push(index);
        lives.value--;
        
        if (lives.value <= 0) {
            state.value = 'feedback';
            setTimeout(() => {
                state.value = 'result';
            }, 1500);
        }
    }
}

function reset() {
    level.value = 1;
    lives.value = 3;
    state.value = 'idle';
}

function saveAndExit() {
    emit('finish', Math.max(0, level.value - 1));
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        if (state.value === 'idle') startLevel();
        else if (state.value === 'result') saveAndExit();
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
  <div class="test-wrapper visual-memory-test">
    <div v-if="state === 'idle'" class="full-height flex-center">
       <div class="center-content text-center">
           <div class="icon-wrap"><Eye :size="64" /></div>
           <h1 class="test-heading">Visuelles Gedächtnis</h1>
           <p class="test-sub">Präge dir das Muster der aufleuchtenden Kacheln ein.</p>
           <BaseButton class="test-btn primary mt-4" @click="startLevel()">Start</BaseButton>
       </div>
    </div>

    <div v-if="state === 'showing' || state === 'input' || state === 'feedback'" class="game-content full-height flex-center">
       <div class="game-header">
          <div class="level-indicator">Level {{ level }}</div>
          <div class="lives-indicator">
             <Heart 
               v-for="i in 3" 
               :key="i" 
               class="heart-icon" 
               :class="{ lost: i > lives }"
               :size="28" 
               fill="currentColor" 
               stroke-width="2"
             />
          </div>
       </div>

       <div class="grid-container" :style="gridStyle">
          <div 
             v-for="index in totalTiles" 
             :key="index"
             class="tile"
             :class="{ 
               'active': activeTiles.includes(index) && (state === 'showing' || state === 'feedback'),
               'revealed': revealedTiles.includes(index),
               'wrong': wrongTiles.includes(index),
               'clickable': state === 'input' && !revealedTiles.includes(index) && !wrongTiles.includes(index)
             }"
             @click="handleTileClick(index)"
          ></div>
       </div>
    </div>

    <div v-if="state === 'result'" class="full-height flex-center">
        <div class="center-content result-content text-center">
            <div class="icon-wrap"><Eye :size="64" /></div>
            <h2 class="test-heading">Level {{ level - 1 }} erreicht!</h2>
            <p class="test-sub">Du hast {{ level - 1 }} Level abgeschlossen.</p>
            <div class="actions mt-4">
                <BaseButton class="test-btn primary" @click="saveAndExit">Speichern & Beenden</BaseButton>
                <BaseButton class="test-btn secondary" @click="reset">Nochmal spielen</BaseButton>
            </div>
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

.test-sub {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

.mt-4 { margin-top: 32px; }

.game-content {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 30px;
}

.level-indicator {
  font-size: 1.5rem;
  font-weight: 700;
}

.lives-indicator {
  display: flex;
  gap: 8px;
}

.heart-icon {
  color: var(--color-danger);
  transition: opacity 0.3s, transform 0.3s;
}

.heart-icon.lost {
  opacity: 0.2;
  transform: scale(0.8);
}

.grid-container {
  display: grid;
  gap: 12px;
  width: 100%;
  aspect-ratio: 1;
}

.tile {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: default;
}

.tile.clickable {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
}

.tile.clickable:hover {
  transform: scale(0.96);
  filter: brightness(1.2);
}

.tile.active, .tile.revealed {
  background: #ffffff;
  transform: scale(1.03);
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3);
  border-color: #ffffff;
}

.tile.wrong {
  background: #ce2636;
  border-color: #ce2636;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px) rotate(-2deg); }
  50% { transform: translateX(5px) rotate(2deg); }
  75% { transform: translateX(-5px) rotate(-2deg); }
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