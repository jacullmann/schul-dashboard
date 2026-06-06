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
  <div class="card">
    <div class="animate-fade-up">
      <PageHeader class="mt-0 flex items-center gap-2">Spiele</PageHeader>
    </div>
    <div
      class="flex flex-col items-center justify-center content-center overflow-hidden animate-fade-up"
      style="animation-delay: 0.05s; animation-fill-mode: both"
    >
      <BaseInput
        id="search-input"
        v-model="searchTag"
        class="mt-2 mb-16 mx-auto max-w-100"
        placeholder="Suchen"
      />

      <div
        class="grid w-full gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
      >
        <router-link
          v-for="(game, index) in filteredGames"
          :key="game.id"
          :to="`/games/${game.id}`"
          class="no-underline color-inherit animate-fade-up"
          :style="{
            animationDelay: `${(index + 2) * 0.05}s`,
            animationFillMode: 'both',
          }"
        >
          <div
            class="bg-surface rounded-xl overflow-hidden h-full flex flex-col border border-surface-border"
          >
            <img
              :src="game.previewImage"
              :alt="`Vorschau von ${game.name}`"
              class="w-full h-[200px] object-cover"
            />
            <div class="px-4 py-3 flex-grow flex flex-col">
              <h3>
                {{ game.name }}
              </h3>
              <p class="mt-1! mb-2! flex-grow">
                {{ game.description }}
              </p>
              <div>
                <span
                  v-for="tag in game.tags"
                  :key="tag"
                  class="text-on-ghost-muted text-sm font-medium"
                >
                  {{ tag
                  }}{{ tag === game.tags[game.tags.length - 1] ? '' : ', ' }}
                </span>
              </div>
            </div>
          </div>
        </router-link>
      </div>

      <div
        v-if="filteredGames.length === 0"
        class="text-on-ghost-muted text-center text-[1.2em] mt-10 flex items-center justify-center gap-2"
      >
        <LucideFrown :size="20" />
        Keine Spiele gefunden
      </div>
    </div>
  </div>
</template>
