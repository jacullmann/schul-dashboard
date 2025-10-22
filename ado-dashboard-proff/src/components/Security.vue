<script setup lang="ts">
import {ref} from 'vue';
const secError = ref<boolean>(false);
</script>

<template>
  <n-alert v-if="secError" style="max-width: 300px; top: 50px; background-color: white" type="error" title="Warnung " >
    <n-marquee>
      <div style=" color: black">
        -----------------------------------------------Unbefugter Zugriff erkannt----------------------------Sicherheitsmaßnahmen eingeleitet--------------------------------Angreifer identifiziert----------------------------------Angreifer lokalisiert--------------------------------Wähle 110.......................................................................................................................................................
      </div>
    </n-marquee>
  </n-alert>
</template>

<style scoped>
n-alert {
  position: absolute;
}
</style>