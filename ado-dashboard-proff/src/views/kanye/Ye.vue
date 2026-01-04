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
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476511/late_registration_album_cover_zp9cv6.jpg'
  },
  {
    id: 2,
    route: 'graduation',
    title: 'Graduation',
    artist: 'Kanye West',
    year: 2007,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476510/graduation_album_cover_grirt8.jpg'
  },
  {
    id: 3,
    route: 'twisted-fantasy',
    title: 'My Beautiful Dark Twisted Fantasy',
    artist: 'Kanye West',
    year: 2010,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476511/my_beautiful_dark_twisted_fantasy_album_cover_s8o1tg.jpg'
  },
  {
    id: 4,
    route: 'yeezus',
    title: 'Yeezus',
    artist: 'Kanye West',
    year: 2013,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476511/yeezus_album_cover_npx8e1.jpg'
  },
  {
    id: 5,
    route: 'ye',
    title: 'ye',
    artist: 'Kanye West',
    year: 2018,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476510/ye_album_cover_s9vsut.jpg'
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
    <p style="font-size: 0.7rem; color: var(--sub)">Album art used for identification purposes only. Copyright belongs to the respective owners, labels, and artists.</p>
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