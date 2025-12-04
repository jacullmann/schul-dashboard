<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

interface Album {
  id: number;
  route: string;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
}

const albums: Album[] = [
  {
    id: 1,
    route: 'late-registration',
    title: 'Late Registration',
    artist: 'Kanye West',
    year: 2005,
    coverUrl: 'https://t2.genius.com/unsafe/1243x0/https%3A%2F%2Fimages.genius.com%2Ff950b7a07bb95fdd4d1499681c570348.1000x1000x1.png'
  },
  {
    id: 2,
    route: 'graduation',
    title: 'Graduation',
    artist: 'Kanye West',
    year: 2007,
    coverUrl: 'https://t2.genius.com/unsafe/1243x0/https%3A%2F%2Fimages.genius.com%2Fb9d6cf24ceb76fa5d8ebf02569e16e2f.1000x1000x1.png'
  },
  {
    id: 3,
    route: 'twisted-fantasy',
    title: 'My Beautiful Dark Twisted Fantasy',
    artist: 'Kanye West',
    year: 2010,
    coverUrl: 'https://t2.genius.com/unsafe/795x0/https%3A%2F%2Fimages.genius.com%2F52a86a50e0d807c9fe37429cdfaae8e9.888x888x1.png'
  },
  {
    id: 4,
    route: 'yeezus',
    title: 'Yeezus',
    artist: 'Kanye West',
    year: 2013,
    coverUrl: 'https://t2.genius.com/unsafe/1243x0/https%3A%2F%2Fimages.genius.com%2Ff4daff29a000bf818c5e53355c12d672.1000x1000x1.png'
  },
  {
    id: 5,
    route: 'ye',
    title: 'ye',
    artist: 'Kanye West',
    year: 2018,
    coverUrl: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fis1-ssl.mzstatic.com%2Fimage%2Fthumb%2FMusic125%2Fv4%2Ff8%2F92%2F62%2Ff892628e-bfd5-2437-c1f5-0ebbd366de09%2F00602577303098.rgb.jpg%2F1200x1200bf-60.jpg&f=1&nofb=1&ipt=1c3bd967f035772f04d500d59782f9d90233852aa34f3b744ca5882aa26a7b4e'
  }
];
function kanyeRouter(album: Album) {
  router.push(`/kanye/${album.route}`);

}

</script>

<template>
  <div v-if="route.path === '/kanye'" class="gallery-container">
    <div @click="kanyeRouter(album)" v-for="album in albums" :key="album.id" class="album-card">

      <div class="image-wrapper">
        <img :src="album.coverUrl" :alt="album.title" class="album-cover" />
      </div>

      <div class="info-card">
        <h3 class="album-title">{{ album.title }}</h3>

        <div class="album-meta">
          <span class="artist-name">{{ album.artist }}</span>
          <span class="album-year">{{ album.year }}</span>
        </div>
      </div>

    </div>
  </div>
  <router-view />
</template>

<style scoped>
.gallery-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.album-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease;
  cursor: pointer;
}

.album-card:hover {
  transform: translateY(-5px);
}

.image-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
}

.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.info-card {
  background-color: #282828;
  padding: 12px;
  display: flex;
  flex-direction: column;
  border-radius:0px 0px 12px 12px;
  border:1px solid #414141;
  border-top:0px;
  gap:8px;
}

.album-title {
  color: #f1f1f1;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #aaa;
  font-size: 0.9rem;
}
</style>