<script setup lang="ts">
import { ref, computed } from 'vue';
import { games } from '@/modules/games/composables/GameData';
import { LucideFrown } from '@lucide/vue';

const searchTag = ref('');

const filteredGames = computed(() => {
  const query = searchTag.value.trim().toLowerCase();

  if (!query) {
    return games;
  }

  return games.filter((game) => {
    const textMatch =
      game.name.toLowerCase().includes(query) ||
      game.description.toLowerCase().includes(query) ||
      game.id.toLowerCase().includes(query);

    const tagMatch = game.tags.some((tag) => tag.toLowerCase().includes(query));

    return textMatch || tagMatch;
  });
});
</script>

<template>
  <div class="card rlc">
    <div>
      <h2 class="mt-0 flex items-center gap-2">Spiele</h2>
    </div>
    <div class="flex flex-col items-center justify-center content-center overflow-hidden p-5">
      <div class="w-full max-w-[380px] mb-[30px] left-0">
        <BaseInput id="search-input" v-model="searchTag" placeholder="Suchen" />
      </div>
      <div class="grid gap-5 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        <router-link
          v-for="game in filteredGames"
          :key="game.id"
          :to="`/games/${game.id}`"
          class="no-underline color-inherit"
        >
          <div class="bg-canvas rounded-lg overflow-hidden h-full flex flex-col border border-canvas-border m-[35px] sm:m-0">
            <img
              :src="game.previewImage"
              :alt="`Vorschau von ${game.name}`"
              class="w-full h-[200px] object-cover"
            />
            <div class="p-4 flex-grow flex flex-col">
              <h3 class="text-on-surface mt-0 mb-2 text-[1.5em]">{{ game.name }}</h3>
              <p class="text-on-surface-muted text-[0.9em] mb-4 flex-grow">{{ game.description }}</p>
              <div class="mt-2.5">
                <div
                  v-for="tag in game.tags"
                  :key="tag"
                  class="mr-1.5 text-[0.85em] p-1 px-2 rounded"
                >
                  {{ tag }}
                </div>
              </div>
            </div>
          </div>
        </router-link>
      </div>

      <div v-if="filteredGames.length === 0" class="text-on-surface-muted text-center text-[1.2em] mt-10 flex items-center justify-center gap-2">
        <LucideFrown :size="20" />
        Keine Spiele gefunden
      </div>
    </div>
  </div>
</template>
