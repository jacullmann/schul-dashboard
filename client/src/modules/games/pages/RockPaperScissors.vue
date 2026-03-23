<script setup lang="ts">
import { ref, computed } from 'vue';

type Choice = 'Schere' | 'Stein' | 'Papier' | null;
type Result = 'Gewonnen' | 'Verloren' | 'Unentschieden' | null;

const choices: Choice[] = ['Schere', 'Stein', 'Papier'];

const playerChoice = ref<Choice>(null);
const computerChoice = ref<Choice>(null);
const gameResult = ref<Result>(null);
const isGameOver = ref(false);

const choiceEmojis = {
  'Schere': '✂️',
  'Stein': '🪨',
  'Papier': '📄',
};

const determineWinner = (p1: Choice, p2: Choice): Result => {
  if (p1 === p2) return 'Unentschieden';
  if (
      (p1 === 'Schere' && p2 === 'Papier') ||
      (p1 === 'Stein' && p2 === 'Schere') ||
      (p1 === 'Papier' && p2 === 'Stein')
  ) {
    return 'Gewonnen';
  }
  return 'Verloren';
};

const status = computed(() => {
  if (!playerChoice.value) {
    return 'Wähle Schere, Stein oder Papier!';
  }
  if (!isGameOver.value) {
    return 'Der Computer wählt...';
  }
  return `Ergebnis: ${gameResult.value}!`;
});

const resultClass = computed(() => {
  if (gameResult.value === 'Gewonnen') return 'won';
  if (gameResult.value === 'Verloren') return 'lost';
  if (gameResult.value === 'Unentschieden') return 'draw';
  return '';
});

const makeMove = (choice: Choice) => {
  if (isGameOver.value || !choice) return;

  playerChoice.value = choice;
  computerChoice.value = null; // Zurücksetzen für Animation

  // Computer wählt nach einer kurzen Verzögerung
  setTimeout(() => {
    const randomIdx = Math.floor(Math.random() * 3);
    computerChoice.value = choices[randomIdx];

    gameResult.value = determineWinner(playerChoice.value, computerChoice.value);
    isGameOver.value = true;
  }, 500);
};

const resetGame = () => {
  playerChoice.value = null;
  computerChoice.value = null;
  gameResult.value = null;
  isGameOver.value = false;
};
</script>

<template>
  <div class="rps-game">
    <div class="result-display">
      <div class="choice-card player-choice">
        <h3>Du</h3>
        <div class="icon-box">
          <span v-if="playerChoice" class="icon-emoji">{{ choiceEmojis[playerChoice] }}</span>
          <span v-else class="icon-placeholder">?</span>
        </div>
      </div>

      <div class="vs-text">VS</div>

      <div class="choice-card computer-choice">
        <h3>Computer</h3>
        <div class="icon-box">
          <span v-if="computerChoice" class="icon-emoji">{{ choiceEmojis[computerChoice] }}</span>
          <span v-else class="icon-placeholder">?</span>
        </div>
      </div>
    </div>

    <div class="game-status" :class="resultClass">
      {{ status }}
    </div>

    <div class="controls" v-if="!isGameOver">
      <BaseButton v-for="choice in choices" :key="choice" @click="makeMove(choice)" class="btn-choice">
        {{ choiceEmojis[choice] }} {{ choice }}
      </BaseButton>
    </div>

    <BaseButton v-if="isGameOver" @click="resetGame" class="btn-reset">
      Neues Spiel starten
    </BaseButton>
  </div>
</template>

<style scoped>
.rps-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  border-radius: 12px;
}

.result-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  width: 100%;
}

.choice-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  width: 150px;
  min-height: 180px;
  background-color: var(--color-canvas);
}

.choice-card h3 {
  margin-top: 0;
  color: var(--color-sub);
}

.icon-box {
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 4em;
  background-color: var(--color-surface);
  border-radius: 10px;
  transition: background-color 0.5s;
}

.icon-placeholder {
  font-size: 2em;
  color: white;
}

.vs-text {
  font-size: 2.5em;
  font-weight: bold;
  color: #f39c12;
}

.game-status {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 25px;
  padding: 10px 20px;
  border-radius: 8px;
  min-height: 20px;
  text-align: center;
}

.game-status.won {
  color: white;
  background-color: #4caf50; /* Grün */
}
.game-status.lost {
  color: white;
  background-color: #f44336; /* Rot */
}
.game-status.draw {
  color: white;
  background-color: #3f51b5; /* Blau */
}

.controls {
  display: flex;
  gap: 15px;
}

.btn-choice {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1em;
  background-color: #9b59b6;
  color: var(--color-on-surface);
  transition: background-color 0.2s, transform 0.1s;
}

.btn-choice:hover {
  background-color: #8e44ad;
  transform: translateY(-2px);
}

.btn-reset {
  background-color: #e91e63;
  color: var(--color-on-surface);
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
</style>
