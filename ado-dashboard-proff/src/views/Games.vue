<template>
  <div class="games card">
    <div class="container-game-grid">
      <div class="games-hero">
        <div class="games-hero__title">
          <div style="display: flex; flex-direction: row; align-items: center; gap: 15px; bottom: 0">
            <Gamepad2 size="35px"/>
            <h2 >Spiele</h2>

          </div>

          <p class="subtitle">Eine Auswahl an verschiedenen Spielen</p>
        </div>
      </div>

      <div class="search-bar">
        <input
            v-model="searchTag"
            placeholder="Suchen"
            class="search-input"
        />
      </div>
      <div class="game-grid">
        <router-link
            v-for="game in filteredGames"
            :key="game.id"
            :to="`/spiele/${game.id}`"
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
        <LucideFrown size="1.2rem"/>
        Keine Spiele gefunden
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { games } from '../components/spiele/GameData';
import { useRouter } from 'vue-router';
import { Gamepad2, LucideFrown, Search } from "lucide-vue-next";

const router = useRouter();

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

<style scoped>
.container-game-grid {
  padding: 20px;
  max-width: 1100px;
  margin: 0 auto;
}
.games-hero {
  margin-bottom: 20px;
  padding: 20px 0;
}
.games-hero__title h2 {
  font-size: 2.5em;
  margin: 0;
  color: white;
}
.subtitle {
  color: white;
  font-size: 1.1em;
}

.search-bar {
  margin-bottom: 30px;
  max-width: 400px;
  left: 0;
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  font-size: 1.1em;
  border: 2px solid var(--jj);
  border-radius: 8px;
  background-color: var(--card);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: var(--sub);
}

.search-input:focus {
  border-color: #51514d;
  outline: none;
}

.no-results {
  color: var(--muted);
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
  background: var(--card);
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
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
  color: white;
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.5em;
}

.game-description {
  color: var(--muted);
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