<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getGameById } from '@/modules/games/composables/GameData';
import type { Game } from '@/modules/games/types';

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
    router.replace('/spiele'); // Zurück zur Übersicht
  }
};

onMounted(() => {
  loadGame(route.params.id as string);
});

// Beobachte Änderungen der Route (falls man von einem Spiel zum nächsten navigiert)
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadGame(newId as string);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="card">
    <div v-if="!game">
      <h3 class="text-center">Spiel wird geladen...</h3>
    </div>

    <div v-else class="p-5">
      <router-link to="/games" class="inline-flex items-center gap-2 mb-5 text-on-surface-muted transition-colors hover:text-on-surface">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Zurück zur Spiele-Übersicht
      </router-link>

      <div class="p-[30px] rounded-xl">
        <h1 class="mt-0 mb-2.5 text-on-surface text-[2em]">{{ game.name }}</h1>
        <p class="text-on-surface-muted text-[1.1em] mb-5">{{ game.description }}</p>
        <hr class="border-t border-surface" />

        <component :is="game.component" class="pt-5" />
      </div>
    </div>
  </div>
</template>
