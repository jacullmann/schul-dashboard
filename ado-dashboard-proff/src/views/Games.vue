<template>
  <div class="games card">
    <div class="container-game-grid">
      <div class="games-hero">
        <div class="games-hero__title">
          <h2 style="margin-top: 0">Spiele</h2>
          <p class="subtitle">Eine Auswahl an verschiedenen Spielen</p>
        </div>
      </div>

      <div class="game-grid">
        <router-link
            v-for="game in games"
            :key="game.id"
            :to="`/8912/${game.id}`"
            class="game-card-link"
        >
          <div class="game-card">
            <img :src="game.previewImage" :alt="`Vorschau von ${game.name}`" class="game-preview-image">
            <div class="game-info">
              <h3 class="game-name">{{ game.name }}</h3>
              <p class="game-description">{{ game.description }}</p>
              <div class="game-tags">
                <span v-for="tag in game.tags" :key="tag" class="badge game-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { games } from '../components/spiele/GameData';
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<style scoped>
.container-game-grid {
  padding: 20px;
  max-width: 1100px;
  margin: 0 auto;
}
.games-hero {
  margin-bottom: 40px;
  padding: 20px 0;
}
.games-hero__title h2 {
  font-size: 2.5em;
  margin-bottom: 5px;
  color: white;
}
.subtitle {
  color: white;
  font-size: 1.1em;
}

.game-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
  flex-grow: 1; /* Lässt den Infobereich den restlichen Platz einnehmen */
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
  /* Nutzt die globale .badge-Klasse */
  background: #282828;
  color: var(--sub);
  margin-right: 5px;
  font-size: 0.8em;
  padding: 4px 8px;
  border-radius: 4px;
}


@media (max-width: 700px) {
  .game-card-link {
  }
  .game-grid {
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

}
</style>
