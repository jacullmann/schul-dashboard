<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const emojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝'];
const cards = ref<
  { id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]
>([]);
const flippedCards = ref<number[]>([]);
const { t } = useI18n();
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
  const card = cards.value[index];
  if (
    !card ||
    flippedCards.value.length === 2 ||
    card.isFlipped ||
    card.isMatched
  )
    return;

  card.isFlipped = true;
  flippedCards.value.push(index);

  if (flippedCards.value.length === 2) {
    moves.value++;
    checkMatch();
  }
};

const checkMatch = () => {
  const [idx1, idx2] = flippedCards.value;
  const first = idx1 === undefined ? undefined : cards.value[idx1];
  const second = idx2 === undefined ? undefined : cards.value[idx2];
  if (!first || !second) return;

  if (first.emoji === second.emoji) {
    first.isMatched = true;
    second.isMatched = true;
    flippedCards.value = [];
    if (cards.value.every((card) => card.isMatched)) {
      isGameOver.value = true;
    }
  } else {
    setTimeout(() => {
      first.isFlipped = false;
      second.isFlipped = false;
      flippedCards.value = [];
    }, 1000);
  }
};

onMounted(initGame);
</script>

<template>
  <div class="memory-container">
    <h2>Memory</h2>
    <p>{{ t('games.memory.moves_count', { moves }) }}</p>
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
      <h3>{{ t('games.memory.victory_title') }}</h3>
      <p>{{ t('games.memory.victory_message', { moves }) }}</p>
      <BaseButton @click="initGame">{{
        t('games.common.play_again')
      }}</BaseButton>
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
