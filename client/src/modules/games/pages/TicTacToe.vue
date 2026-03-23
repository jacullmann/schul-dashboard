<script setup lang="ts">
import { ref, computed } from 'vue';

const PLAYER_X = 'X';
const PLAYER_O = 'O';

const board = ref<(string | null)[]>(Array(9).fill(null));
const currentPlayer = ref(PLAYER_X);
const isGameOver = ref(false);
const winningCombination = ref<number[]>([]);

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const status = computed(() => {
  if (isGameOver.value) {
    if (winningCombination.value.length > 0) {
      return `Spieler ${currentPlayer.value === PLAYER_X ? PLAYER_O : PLAYER_X} hat gewonnen!`;
    }
    return 'Unentschieden!';
  }
  return `Spieler ${currentPlayer.value} ist an der Reihe.`;
});

const checkWinner = (currentBoard: (string | null)[]): boolean => {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
      winningCombination.value = combo;
      return true;
    }
  }
  return false;
};

const makeMove = (index: number) => {
  if (isGameOver.value || board.value[index]) {
    return;
  }

  board.value[index] = currentPlayer.value;

  if (checkWinner(board.value)) {
    isGameOver.value = true;
    return;
  }

  if (board.value.every(cell => cell !== null)) {
    isGameOver.value = true;
    return;
  }

  currentPlayer.value = currentPlayer.value === PLAYER_X ? PLAYER_O : PLAYER_X;
};

const resetGame = () => {
  board.value = Array(9).fill(null);
  currentPlayer.value = PLAYER_X;
  isGameOver.value = false;
  winningCombination.value = [];
};
</script>

<template>
  <div class="tic-tac-toe-game">
    <div class="game-status" :class="{ 'won': status.includes('gewonnen') }">
      {{ status }}
    </div>

    <div class="board">
      <div
          v-for="(cell, index) in board"
          :key="index"
          class="cell"
          @click="makeMove(index)"
          :class="{ 'x-player': cell === 'X', 'o-player': cell === 'O', 'winning-cell': winningCombination.includes(index) }"
      >
        <svg v-if="cell === 'O'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>

        <svg v-else-if="cell === 'X'"  xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-icon lucide-circle"><circle cx="12" cy="12" r="10"/></svg>
      </div>
    </div>

    <BaseButton @click="resetGame" variant="ghost">
      Neues Spiel starten
    </BaseButton>
  </div>
</template>

<style scoped>
.tic-tac-toe-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.game-status {
  font-size: 1.5em;
  margin-bottom: 20px;
}

.game-status.won {
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 80px);
  grid-template-rows: repeat(3, 80px);
  gap: 5px;
  margin-bottom: 20px;
  background-color: var(--color-surface);
  padding: 5px;
  border-radius: 8px;
}

.cell {
  background-color: var(--color-canvas);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 3em;
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.1s;
  user-select: none;
}

.cell:hover:not(.x-player):not(.o-player) {
}


.winning-cell {
  background-color: var(--color-sub) !important;
}


.btn {
  font-weight: bold;
  font-size: 1.1rem;
}
</style>
