<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
    route: 'the-college-droupout',
    title: 'The College Dropout',
    artist: 'Kanye West',
    year: 2004,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360124/the_college_dropout_album_cover_klk4ys.jpg'
  },
  {
    id: 2,
    route: 'late-registration',
    title: 'Late Registration',
    artist: 'Kanye West',
    year: 2005,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476511/late_registration_album_cover_zp9cv6.jpg'
  },
  {
    id: 3,
    route: 'graduation',
    title: 'Graduation',
    artist: 'Kanye West',
    year: 2007,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476510/graduation_album_cover_grirt8.jpg'
  },
  {
    id: 4,
    route: '808s-and-heartbreak',
    title: '808s & Heartbreak',
    artist: 'Kanye West',
    year: 2008,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360122/808s_and_heartbreak_album_cover_nlug69.jpg'
  },
  {
    id: 5,
    route: 'twisted-fantasy',
    title: 'My Beautiful Dark Twisted Fantasy',
    artist: 'Kanye West',
    year: 2010,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476511/my_beautiful_dark_twisted_fantasy_album_cover_s8o1tg.jpg'
  },
  {
    id: 6,
    route: 'watch-the-throne',
    title: 'Watch The Throne',
    artist: 'Jay-Z, Kanye West',
    year: 2011,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360116/watch_the_throne_album_cover_fedaqe.jpg'
  },
  {
    id: 7,
    route: 'yeezus',
    title: 'Yeezus',
    artist: 'Kanye West',
    year: 2013,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476511/yeezus_album_cover_npx8e1.jpg'
  },
  {
    id: 8,
    route: 'life-of-pablo',
    title: 'The Life Of Pablo',
    artist: 'Kanye West',
    year: 2016,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360127/the_life_of_pablo_album_cover_r1j3z2.jpg'
  },
  {
    id: 9,
    route: 'ye',
    title: 'ye',
    artist: 'Kanye West',
    year: 2018,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1767476510/ye_album_cover_s9vsut.jpg'
  },
  {
    id: 10,
    route: 'kids-see-ghosts',
    title: 'KIDS SEE GHOSTS',
    artist: 'Kanye West, Kid Cudi',
    year: 2018,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360115/kids_see_ghosts_album_cover_qlk2qh.jpg'
  },
  {
    id: 11,
    route: 'jesus-is-king',
    title: 'Jesus Is King',
    artist: 'Kanye West',
    year: 2019,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360120/jesus_is_king_album_cover_ru2gxe.jpg'
  },
  {
    id: 12,
    route: 'donda',
    title: 'Donda',
    artist: 'Kanye West',
    year: 2021,
    coverUrl: 'https://res.cloudinary.com/dwysdpvcm/image/upload/v1771360114/donda_album_cover_jh5sng.jpg'
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
    <p style="font-size: var(--font-size-footnote); color: var(--sub)">{{ t('info.kanye.footnote') }}</p>
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
  background-color: var(--vlbg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  border-radius:0 0 12px 12px;
  border:1px solid var(--border2);
  border-top:0;
  gap:8px;
}

.album-title {
  color: var(--text);
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
  color: var(--sub);
  font-size: 0.9rem;
}
</style>