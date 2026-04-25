<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const holes = ref(new Array(9).fill(false));
const score = ref(0);
const timeLeft = ref(30);
const isGameOver = ref(false);
let moleInterval: number | null = null;
let timerInterval: number | null = null;
const activeMole = ref<number | null>(null);

const popMole = () => {
  if (activeMole.value !== null) {
    holes.value[activeMole.value] = false;
  }

  if (isGameOver.value) return;

  // Chance to not show a mole (brief pause)
  if (Math.random() < 0.2) {
    activeMole.value = null;
  } else {
    activeMole.value = Math.floor(Math.random() * holes.value.length);
    holes.value[activeMole.value] = true;
  }
};

const whack = (index: number) => {
  if (!isGameOver.value && holes.value[index]) {
    score.value += 10;
    holes.value[index] = false;
    activeMole.value = null;
  }
};

const startGame = () => {
  score.value = 0;
  timeLeft.value = 30;
  isGameOver.value = false;
  holes.value.fill(false);
  activeMole.value = null;

  if (moleInterval) clearInterval(moleInterval);
  if (timerInterval) clearInterval(timerInterval);

  moleInterval = window.setInterval(popMole, 800);
  timerInterval = window.setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      endGame();
    }
  }, 1000);
};

const endGame = () => {
  isGameOver.value = true;
  if (moleInterval) clearInterval(moleInterval);
  if (timerInterval) clearInterval(timerInterval);
  holes.value.fill(false);
  activeMole.value = null;
};

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  if (moleInterval) clearInterval(moleInterval);
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div class="mole-container">
    <h2>Whack-a-Mole</h2>
    <div class="stats">
      <p>Punkte: {{ score }}</p>
      <p>Zeit: {{ timeLeft }}s</p>
    </div>

    <div class="grid">
      <div
        v-for="(isMole, index) in holes"
        :key="index"
        class="hole"
        @click="whack(index)"
      >
        <div class="dirt"></div>
        <div class="mole" :class="{ up: isMole }">🐹</div>
      </div>
    </div>

    <div v-if="isGameOver" class="game-over">
      <h3>Zeit abgelaufen! ⏰</h3>
      <p>Du hast {{ score }} Punkte erreicht.</p>
      <BaseButton @click="startGame">Nochmal spielen</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.mole-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--color-canvas);
  border-radius: 8px;
}
h2 {
  color: var(--color-on-ghost);
  margin-bottom: 5px;
}
.stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  color: var(--color-on-ghost);
  font-weight: bold;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  background: #8b5a2b;
  padding: 20px;
  border-radius: 10px;
}
.hole {
  width: 80px;
  height: 80px;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  cursor: pointer;
  background: #5c3a21;
}
.dirt {
  width: 100%;
  height: 30%;
  background: #3e2716;
  position: absolute;
  bottom: 0;
  border-radius: 50% 50% 0 0;
  z-index: 2;
}
.mole {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 100%;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  font-size: 3rem;
  transition: top 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1;
  padding-bottom: 10px;
  user-select: none;
}
.mole.up {
  top: 0;
}
.game-over {
  margin-top: 20px;
  text-align: center;
  color: var(--color-on-ghost);
}
.btn {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: var(--accent, #42b883);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.btn:hover {
  opacity: 0.9;
}
</style>
