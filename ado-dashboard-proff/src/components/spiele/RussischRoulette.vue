<template>
  <div class="bout">
  <div class="toub" >

    <img style="height: 200px"
      src="https://www.brownells-deutschland.de/WebRoot/MediaDefinition/userdocs/skus/l_430105717_1.jpg?sig=4a04af136522f8c54be3edd9586d4ba25c8fe88c95dbb7b70b70f2cca9dc933d"
  />
    <div class="simple-roulette-game">
      <div
          class="game-status"
          :class="{
            'won': hasPlayed && survived,
            'lost': hasPlayed && !survived
        }"
      >
        {{ status }}
      </div>

      <button
          @click="pullTrigger"
          :disabled="hasPlayed"
          class="btn btn-trigger"
      >
        Schießen
      </button>

      <button
          @click="resetGame"
          class="btn btn-reset"
      >
        Nächster Schuss
      </button>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const hasPlayed = ref(false);
const survived = ref(false);

const status = computed(() => {
  if (!hasPlayed.value) {
    return 'Deine Chancen stehen 1 zu 6.';
  }

  if (survived.value) {
    return 'Du hast überlebt.';
  } else {
    return 'Du bist gestorben';
  }
});

const pullTrigger = () => {
  if (hasPlayed.value) return;
  if (Math.random() < (1 / 6)) {
    survived.value = false;
  } else {
    survived.value = true;
  }

  hasPlayed.value = true;
};

const resetGame = () => {
  hasPlayed.value = false;
  survived.value = false;
};
</script>

<style scoped>

.bout{
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;

}
.toub  {
  display: flex;
  flex-direction: row;
  align-items: center
}



.simple-roulette-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  font-family: sans-serif;
}

.game-status {
  font-size: 1.2em;
  margin-bottom: 30px;
  padding: 10px 20px;
  border-radius: 8px;
  background-color: var(--vlbg);
  color: var(--text);
  min-width: 320px;
  text-align: center;
}

.game-status.won {
  color: white;
  font-weight: bold;
}

.game-status.lost {
  color: white;
  font-weight: bold;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin: 5px;
}

.btn-trigger {
  background-color: #3f51b5;
  color: white;
  font-size: 1.5em;
  padding: 15px 30px;
}

.btn-trigger:disabled {
  background-color: #555;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-reset {
  background-color: #9e9e9e;
  color: black;
}

@media (max-width: 700px) {
  .toub{
    flex-direction: column;
  }
  .game-status{
    min-width: 200px;
  }



}
</style>