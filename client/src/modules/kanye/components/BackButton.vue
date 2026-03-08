<script setup lang="ts">

</script>

<template>
<div>
  <router-link to="/kanye">
  <span class="back">Zurück</span>
  </router-link>
</div>
</template>

<style scoped>
.back {
  color: var(--text);
  z-index: 99999999999999999999999999999999999;
  font-size: 20px;
  cursor: pointer;
  position: absolute;
}

</style>