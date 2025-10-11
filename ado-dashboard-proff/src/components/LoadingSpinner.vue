<template>
  <span
      class="loader"
      :style="{
        width: size,
        height: size,
        borderWidth: borderThickness, /* Verwendet die Prop direkt */
        borderColor: `rgba(255, 255, 255, 0.4)`, /* Behält den transparenten weißen Track */
        borderTopColor: color, /* Die übergebene Farbe für den sich drehenden Teil */
      }"
      role="status"
      aria-label="Wird geladen..."
  ></span>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'; // 'computed' ist nicht mehr nötig

// Definiere die Props mit Standardwerten
const props = withDefaults(defineProps<{
  color?: string;
  size?: string;
  borderThickness?: string;
}>(), {
  color: '#fff', // Standardfarbe: Weiß
  size: '18px', // Standardgröße: 18px
  borderThickness: '2px', // Standarddicke: 2px
});
</script>

<style scoped>
.loader {
  border-radius: 50%;
  display: inline-block; /* Muss vorhanden sein, damit width/height funktionieren */
  animation: spin 0.8s linear infinite;
  border-style: solid; /* Muss für CSS-Border vorhanden sein */
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>