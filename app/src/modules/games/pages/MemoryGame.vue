<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝'];
const cards = ref<
  { id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]
>([]);
const flippedCards = ref<number[]>([]);
const moves = ref(0);
const isGameOver = ref(false);

const initGame = () => {
  const shuffledEmojis = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  cards.value = shuffledEmojis.map((emoji, index) => ({
    id: index,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
  moves.value = 0;
  isGameOver.value = false;
  flippedCards.value = [];
};

const flipCard = (index: number) => {
  if (
    flippedCards.value.length === 2 ||
    cards.value[index].isFlipped ||
    cards.value[index].isMatched
  )
    return;

  cards.value[index].isFlipped = true;
  flippedCards.value.push(index);

  if (flippedCards.value.length === 2) {
    moves.value++;
    checkMatch();
  }
};

const checkMatch = () => {
  const [idx1, idx2] = flippedCards.value;
  if (cards.value[idx1].emoji === cards.value[idx2].emoji) {
    cards.value[idx1].isMatched = true;
    cards.value[idx2].isMatched = true;
    flippedCards.value = [];
    if (cards.value.every((card) => card.isMatched)) {
      isGameOver.value = true;
    }
  } else {
    setTimeout(() => {
      cards.value[idx1].isFlipped = false;
      cards.value[idx2].isFlipped = false;
      flippedCards.value = [];
    }, 1000);
  }
};

onMounted(initGame);
</script>

<template>
  <div class="memory-container">
    <h2>Memory</h2>
    <p>Züge: {{ moves }}</p>
    <div class="grid">
      <div
        v-for="(card, index) in cards"
        :key="card.id"
        class="card"
        :class="{
          flipped: card.isFlipped || card.isMatched,
          matched: card.isMatched,
        }"
        @click="flipCard(index)"
      >
        <div class="card-inner">
          <div class="card-front"></div>
          <div class="card-back">{{ card.emoji }}</div>
        </div>
      </div>
    </div>
    <div v-if="isGameOver" class="game-over">
      <h3>Gewonnen! 🎉</h3>
      <p>Du hast {{ moves }} Züge gebraucht.</p>
      <BaseButton @click="initGame">Nochmal spielen</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.memory-container {
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
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-width: 400px;
  width: 100%;
}
.card {
  aspect-ratio: 1;
  perspective: 1000px;
  cursor: pointer;
}
.card-inner {
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  position: relative;
}
.card.flipped .card-inner {
  transform: rotateY(180deg);
}
.card-front,
.card-back {
  width: 100%;
  height: 100%;
  position: absolute;
  backface-visibility: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.card-front {
  background-color: var(--accent, #42b883);
}
.card-back {
  background-color: var(--color-surface);
  transform: rotateY(180deg);
  border: 2px solid var(--accent, #42b883);
}
.card.matched .card-back {
  background-color: #d4edda;
  border-color: #28a745;
}
.game-over {
  margin-top: 20px;
  text-align: center;
  color: var(--color-on-ghost);
}
</style>
