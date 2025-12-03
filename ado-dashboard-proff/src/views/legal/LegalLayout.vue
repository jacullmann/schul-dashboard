<!-- src/views/legal/LegalLayout.vue -->
<template>
  <div class="card">
    <div class="row" style="margin-bottom:16px;">
      <router-link
          to="impressum"
          :class="{ active: $route.path.endsWith('/impressum') }"
      >
        <button
            class="btn ghost"
        >
          Impressum
        </button>
      </router-link>
      <router-link
          to="datenschutzerklaerung"
          :class="{ active: $route.path.endsWith('/datenschutzerklaerung') }"
      >
        <button
            class="btn ghost"
        >
          Datenschutz
        </button>
      </router-link>
    </div>
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>
<style scoped>
</style>
