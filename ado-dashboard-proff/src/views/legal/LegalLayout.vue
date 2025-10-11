<!-- src/views/legal/LegalLayout.vue -->
<template>
  <div class="card">
    <!-- Switch Buttons -->
    <div class="row" style="margin-bottom:16px;">
      <router-link
          to="impressum"
          class="btn ghost"
          :class="{ active: $route.path.endsWith('/impressum') }"
          data-umami-event="Legal Link zu Impressum"
      >
        Impressum
      </router-link>
      <router-link
          to="datenschutzerklaerung"
          class="btn ghost"
          :class="{ active: $route.path.endsWith('/datenschutzerklaerung') }"
          data-umami-event="Legal Link zu Datenschutzerklärung"
      >
        Datenschutz
      </router-link>
    </div>

    <!-- Hier erscheinen die Kind-Routen -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
// keine Logik nötig
</script>
