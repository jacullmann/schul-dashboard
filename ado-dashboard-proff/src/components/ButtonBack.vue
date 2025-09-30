<template>
  <button
      class="button-back"
      @click="goBack"
      @mouseenter="createRipple"
  >
    <div class="ripple-container">
      <span
          v-for="ripple in ripples"
          :key="ripple.id"
          class="ripple-effect"
          :style="{
          left: `${ripple.x}px`,
          top: `${ripple.y}px`,
          width: `${ripple.size}px`,
          height: `${ripple.size}px`,
          backgroundColor: ripple.color,
        }"
      ></span>
    </div>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useRipple } from '../composables/useRipple';

const router = useRouter();
const { ripples, createRipple } = useRipple();

function goBack() {
  router.push('/');
}
</script>

<style>
/* Container für die Ripple-Effekte */
.ripple-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Das Ripple-Element */
.ripple-effect {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  opacity: 1;
  animation: ripple-animation 0.6s linear;
}

/* Die magische Animation */
@keyframes ripple-animation {
  to {
    transform: scale(1);
    opacity: 0;
  }
}
</style>