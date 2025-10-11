<template>
  <span
      class="loader"
      :style="{
      width: size,
      height: size,
      borderWidth: border,
      borderColor: `rgba(255, 255, 255, 0.4)`,
      borderTopColor: color,
  }"
  role="status"
  aria-label="Wird geladen..."
  ></span>
</template>

<script setup lang="ts">
import { withDefaults, computed } from 'vue';

// Definiere die Props mit Standardwerten
const props = withDefaults(defineProps<{
  // Farbe des Spinners (CSS-Farbwert, z.B. '#fff', 'red', 'var(--primary)')
  color?: string;
  // Größe des Spinners (CSS-Größenwert, z.B. '18px', '2em', '1rem')
  size?: string;
  // Dicke des Rands (CSS-Größenwert, z.B. '2px', '0.125em')
  borderThickness?: string;
}>(), {
  color: '#fff', // Standardfarbe: Weiß (passt gut in einen primären Button)
  size: '18px', // Standardgröße: 18px (aus deinem Original-CSS)
  borderThickness: '2px', // Standarddicke: 2px (aus deinem Original-CSS)
});

// Berechne den Wert für border
const border = computed(() => props.borderThickness);
</script>

<style scoped>
.loader {
  border-radius: 50%;
  /* Die restlichen CSS-Eigenschaften werden über die Inline-Styles im Template gesetzt */
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* Die Keyframe-Animation bleibt, da sie essenziell für den Spinner ist */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>