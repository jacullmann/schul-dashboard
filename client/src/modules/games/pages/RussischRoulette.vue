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

<template>
  <div class="bout">
  <div class="toub" >

    <img style="height: 200px"
      src="https://de.freepik.com/vektoren-kostenlos/hand-gezeichnete-retro-pistolen_4411660.htm#fromView=keyword&page=1&position=20&uuid=af87634f-2d91-467e-967b-ad76b351a282&query=Revolver"
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
  background-color: var(--bg-surface);
  color: var(--text-default);
  min-width: 320px;
  text-align: center;
}

.game-status.won {
  color: var(--text-default);
  font-weight: bold;
}

.game-status.lost {
  color: var(--text-default);
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
  background-color: var(--primary);
  color: var(--text-default);
  font-size: 1.5em;
  padding: 15px 30px;
}

.btn-trigger:disabled {
  background-color: var(--sub);
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-reset {
  background-color: var(--sub);
  color: var(--bg-canvas);
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