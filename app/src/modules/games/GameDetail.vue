<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getGameById } from '@/modules/games/composables/GameData';
import type { Game } from '@/modules/games/types';
import { ChevronLeft } from '@lucide/vue';

const route = useRoute();
const router = useRouter();
const game = ref<Game | undefined>(undefined);

const loadGame = (gameId: string) => {
  const foundGame = getGameById(gameId);
  if (foundGame) {
    game.value = foundGame;
  } else {
    console.error(`Spiel mit ID "${gameId}" nicht gefunden.`);
    router.replace('/spiele');
  }
};

onMounted(() => {
  loadGame(route.params.id as string);
});

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
      <BaseSpinner />
    </div>

    <div v-else class="p-5">
      <BaseButton
        variant="ghost"
        on="ghost"
        :icon="ChevronLeft"
        @click="router.push('/games')"
      >
        Zurück zur Spiele-Übersicht
      </BaseButton>

      <div class="p-[30px] rounded-xl">
        <h1 class="mt-0 mb-2.5 text-on-ghost text-[2em]">{{ game.name }}</h1>
        <p class="text-on-ghost-muted text-[1.1em] mb-5">
          {{ game.description }}
        </p>
        <hr class="border-t border-surface" />

        <component :is="game.component" class="pt-5" />
      </div>
    </div>
  </div>
</template>
