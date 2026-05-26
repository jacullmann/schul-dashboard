<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';

const gridSize = 20;
const cellSize = 20;

const snake = ref([{ x: 10, y: 10 }]);
const food = ref({ x: 15, y: 15 });
const direction = ref({ x: 0, y: -1 });
const { t } = useI18n();
const score = ref(0);
const isGameOver = ref(false);
const gameLoop = ref<number | null>(null);

const generateFood = () => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    if (
      !snake.value.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y,
      )
    ) {
      break;
    }
  }
  food.value = newFood;
};

const initGame = () => {
  snake.value = [{ x: 10, y: 10 }];
  direction.value = { x: 0, y: -1 };
  score.value = 0;
  isGameOver.value = false;
  generateFood();
  if (gameLoop.value) clearInterval(gameLoop.value);
  gameLoop.value = window.setInterval(update, 150);
};

const update = () => {
  if (isGameOver.value) return;

  const head = { ...snake.value[0] };
  head.x += direction.value.x;
  head.y += direction.value.y;

  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    gameOver();
    return;
  }

  if (
    snake.value.some((segment) => segment.x === head.x && segment.y === head.y)
  ) {
    gameOver();
    return;
  }

  snake.value.unshift(head);

  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += 10;
    generateFood();
  } else {
    snake.value.pop();
  }
};

const gameOver = () => {
  isGameOver.value = true;
  if (gameLoop.value) clearInterval(gameLoop.value);
};

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
      if (direction.value.y === 0) direction.value = { x: 0, y: -1 };
      e.preventDefault();
      break;
    case 'ArrowDown':
      if (direction.value.y === 0) direction.value = { x: 0, y: 1 };
      e.preventDefault();
      break;
    case 'ArrowLeft':
      if (direction.value.x === 0) direction.value = { x: -1, y: 0 };
      e.preventDefault();
      break;
    case 'ArrowRight':
      if (direction.value.x === 0) direction.value = { x: 1, y: 0 };
      e.preventDefault();
      break;
  }
};

useEventListener(window, 'keydown', handleKeydown);

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  if (gameLoop.value) clearInterval(gameLoop.value);
});
</script>

<template>
  <div class="snake-container">
    <h2>Snake</h2>
    <p>Score: {{ score }}</p>

    <div
      class="board"
      :style="{
        width: gridSize * cellSize + 'px',
        height: gridSize * cellSize + 'px',
      }"
    >
      <div
        v-for="(segment, index) in snake"
        :key="'snake-' + index"
        class="snake-segment"
        :class="{ head: index === 0 }"
        :style="{
          left: segment.x * cellSize + 'px',
          top: segment.y * cellSize + 'px',
          width: cellSize + 'px',
          height: cellSize + 'px',
        }"
      ></div>
      <div
        class="food"
        :style="{
          left: food.x * cellSize + 'px',
          top: food.y * cellSize + 'px',
          width: cellSize + 'px',
          height: cellSize + 'px',
        }"
      ></div>
    </div>

    <div v-if="isGameOver" class="game-over">
      <h3>{{ t('games.snake.game_over') }}</h3>
      <BaseButton @click="initGame">{{ t('games.snake.restart') }}</BaseButton>
    </div>

    <div class="controls">
      <p>{{ t('games.snake.instruction') }}</p>
    </div>
  </div>
</template>

<style scoped>
.snake-container {
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

p {
  color: var(--color-on-ghost-muted);
  margin-bottom: 20px;
}

.board {
  position: relative;
  background-color: var(--color-surface);
  border: 2px solid var(--color-canvas-border);
  border-radius: 4px;
  overflow: hidden;
}

.snake-segment {
  position: absolute;
  background-color: var(--accent, #42b883);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.snake-segment.head {
  background-color: #28a745;
}

.food {
  position: absolute;
  background-color: #dc3545;
  border-radius: 50%;
}

.game-over {
  margin-top: 20px;
  text-align: center;
  color: var(--color-on-ghost);
}

.controls {
  margin-top: 20px;
  font-size: 0.9rem;
  color: var(--color-on-ghost-muted);
  text-align: center;
}
</style>
