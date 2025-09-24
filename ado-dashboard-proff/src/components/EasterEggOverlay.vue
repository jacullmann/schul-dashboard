<template>
  <div class="overlay">
    <!-- YouTube Video -->
    <iframe
        class="video"
        :src="`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0`"
        frameborder="0"
        allow="autoplay; encrypted-media"
        allowfullscreen
    ></iframe>

    <!-- Grain Overlay -->
    <div class="grain"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ videoId: string }>();
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  overflow: hidden;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

/* Grain Overlay */
.grain {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 2;
  background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J25vaXNlJyB4PScwJyB5PScwJz48ZmVUdXJidWxlbmNlIHR5cGU9J25vaXNlJyBiYXNlRnJlcXVlbmN5PScwLjknIG51bU9jdGF2ZXM9JzgnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9InVybCgjbm9pc2UpIi8+PC9zdmc+");
  opacity: 0.4; /* sehr stark sichtbar */
  mix-blend-mode: overlay;
  animation: grainMove 0.5s steps(10) infinite;
  pointer-events: none;
}

/* Grain Bewegung */
@keyframes grainMove {
  0% { background-position: 0 0; }
  100% { background-position: 200px 200px; }
}
</style>
