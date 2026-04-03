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

  return games.filter(game => {
    const textMatch = game.name.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.id.toLowerCase().includes(query);

    const tagMatch = game.tags.some(tag => tag.toLowerCase().includes(query));

    return textMatch || tagMatch;
  });
});

</script>

<template>
  <div class="card rlc">
      <div>
        <h2 style="margin-top: 0" class="title-inf" >Spiele</h2>

      </div>
    <div class="container-game-grid">

      <div class="search-bar">
        <BaseInput
            id="search-input"
            v-model="searchTag"
            placeholder="Suchen"
        />
      </div>
      <div class="game-grid">
        <router-link
            v-for="game in filteredGames"
            :key="game.id"
            :to="`/games/${game.id}`"
            class="game-card-link"
        >
          <div class="game-card">
            <img :src="game.previewImage" :alt="`Vorschau von ${game.name}`" class="game-preview-image">
            <div class="game-info">
              <h3 class="game-name">{{ game.name }}</h3>
              <p class="game-description">{{ game.description }}</p>
              <div class="game-tags">

               <!-- <span v-for="tag in game.tags" :key="tag" class="badge game-tag">{{ tag }}</span> -->
                <div v-for="tag in game.tags" :key="tag" class="game-tag"  type="success">
                  {{ tag }}
                </div>

              </div>
            </div>
          </div>
        </router-link>
      </div>

      <div v-if="filteredGames.length === 0" class="no-results">
        <LucideFrown :size="20"/>
        Keine Spiele gefunden
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  margin-bottom: 30px;
  max-width: 380px;
  left: 0;
}

.no-results {
  color: var(--color-on-surface-muted);
  text-align: center;
  font-size: 1.2em;
  margin-top: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

}


.game-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.game-card-link {
  text-decoration: none;
  color: inherit;
}

.game-card {
  background: var(--color-canvas);
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-canvas-border);
}

.game-card-link:hover .game-card {
}

.game-preview-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.game-info {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.game-name {
  color: var(--color-on-surface);
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.5em;
}

.game-description {
  color: var(--color-on-surface-muted);
  font-size: 0.9em;
  margin-bottom: 15px;
  flex-grow: 1;
}

.game-tags {
  margin-top: 10px;
}

.game-tag {
  margin-right: 5px;
  font-size: 0.85em;
  padding: 4px 8px;
  border-radius: 4px;
}


@media (max-width: 700px) {
  .game-card-link {
  }
  .game-grid {
  }
  .game-card {
    margin: 35px;
  }
  .container-game-grid {
    padding: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-content: center;
    justify-content: center;
    align-items: center;
  }
  .search-bar {
    width: 100%;
    max-width: 100%;
  }

}
</style>