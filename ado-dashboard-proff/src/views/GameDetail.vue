<template>
  <div class="game-detail card">
    <!-- Lade-Indikator, falls die Komponente noch nicht geladen ist -->
    <div v-if="!game">
      <h3 class="text-center">Spiel wird geladen...</h3>
    </div>

    <div v-else class="game-container">
      <router-link to="/spiele" class="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        Zurück zur Spiele-Übersicht
      </router-link>

      <!-- Der Wrapper für das Spiel selbst -->
      <div class="game-card">
        <h1 class="game-title">{{ game.name }}</h1>
        <p class="game-description">{{ game.description }}</p>
        <hr>

        <!-- Hier wird die dynamische Spiel-Komponente gerendert -->
        <component :is="game.component" class="game-component-instance" />

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getGameById, Game } from '../components/spiele/GameData';

const route = useRoute();
const router = useRouter();
const game = ref<Game | undefined>(undefined);

const loadGame = (gameId: string) => {
  const foundGame = getGameById(gameId);
  if (foundGame) {
    game.value = foundGame;
  } else {
    // Wenn das Spiel nicht gefunden wird, auf 404 umleiten oder zur Übersicht
    console.error(`Spiel mit ID "${gameId}" nicht gefunden.`);
    router.replace('/8912'); // Zurück zur Übersicht
  }
};

onMounted(() => {
  loadGame(route.params.id as string);
});

// Beobachte Änderungen der Route (falls man von einem Spiel zum nächsten navigiert)
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadGame(newId as string);
  }
}, { immediate: true });
</script>

<style scoped>
.game-detail {
  padding: 20px;
}

.game-container {
  max-width: 900px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  color: var(--sub);
  transition: color 0.2s;
}

.back-link:hover {
  color: white;
}

.back-link svg {
  width: 20px;
  height: 20px;
}

.game-card {
  padding: 30px;
  border-radius: 12px;
}

.game-title {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--text);
  font-size: 2em;
}

.game-description {
  color: var(--muted);
  font-size: 1.1em;
  margin-bottom: 20px;
}

hr {
  border-top: 1px solid var(--jj);
}

.game-component-instance {
  padding-top: 20px;
}

.text-center {
  text-align: center;
  color: var(--muted);
}
</style>
