<template>
  <svg
      v-bind="$attrs"
      version="1.1"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label="schul-dashboard Logo"
  >
    <title>schul-dashboard Logo</title>
    <defs>
      <linearGradient id="linearGradient14">
        <stop style="stop-color: #ffa91a; stop-opacity:1;" offset="0.08389716" id="stop11" />
        <stop style="stop-color: #ff335a; stop-opacity:1;" offset="0.38362652" id="stop12" />
        <stop style="stop-color: #af00ff; stop-opacity:1;" offset="0.69113672" id="stop13" />
        <stop style="stop-color: #5600ff; stop-opacity:1;" offset="1" id="stop14" />
      </linearGradient>
      <linearGradient
          xlink:href="#linearGradient14"
          id="linearGradient8"
          x1="58.46209"
          y1="-160.82309"
          x2="1114.1292"
          y2="333.66876"
          gradientUnits="userSpaceOnUse"
      />
    </defs>
    <path
      style="display: inline; fill: #0f0f0f; fill-opacity: 1; stroke-width: 0; stroke-linecap: square; paint-order: stroke markers fill"
      d="M 0,160 1.3117412e-4,475.00447 1023.9999,472.56856 1024,159.87511 853.47687,44.06984 173.10682,43.669109 Z"
      id="background" />
    <path
      id="bottom"
      style="display: inline; fill: #ffffff; fill-opacity: 1; stroke-width: 0; stroke-linecap: square; paint-order: stroke markers fill"
      d="M -3.5732999e-7,352 V 896 A 128,128 0 0 0 128,1024 H 896 A 128,128 0 0 0 1024,896 V 352 a 32,32 0 0 0 -32,-32 h -64 a 32,32 0 0 0 -32,32 v 32 a 48,48 0 0 1 -48,48 48,48 0 0 1 -48,-48 V 352 A 32,32 0 0 0 768,320 H 256 a 32,32 0 0 0 -32,32 v 32 a 48,48 0 0 1 -48,48 48,48 0 0 1 -48,-48 V 352 A 32,32 0 0 0 96,320 H 32 A 32,32 0 0 0 -3.5732999e-7,352 Z" />
    <path
      id="top"
      style="display: inline; fill: url(#linearGradient8); fill-opacity: 1; stroke-width: 0; stroke-linecap: square; paint-order: stroke markers fill"
      d="m -3.5732999e-7,128 v 64 A 32,32 0 0 0 32,224 h 64 a 32,32 0 0 0 32,-32 v -32 a 48,48 0 0 1 48,-48 48,48 0 0 1 48,48 v 32 a 32,32 0 0 0 32,32 h 512 a 32,32 0 0 0 32,-32 v -32 a 48,48 0 0 1 48,-48 48,48 0 0 1 48,48 v 32 a 32,32 0 0 0 32,32 h 64 a 32,32 0 0 0 32,-32 V 128 A 128,128 0 0 0 896,-3.5732999e-7 H 128 A 128,128 0 0 0 -3.5732999e-7,128 Z" />
    <text
      style="font-weight: 900; font-size: 560px; line-height: 1.1; font-family: Inter, sans-serif; letter-spacing: 0; fill: #0f0f0f; fill-opacity: 1; stroke-width:0; stroke-linecap: square; text-anchor: middle; paint-order: stroke markers fill"
      id="date"
    >
      <tspan x="512" y="880" text-anchor="middle">{{ dayString }}</tspan>
    </text>
  </svg>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const day = ref<number>(new Date().getDate());
const dayString = computed(() => String(day.value));

let intervalId: ReturnType<typeof setInterval>;

function updateDay() {
  const currentDay = new Date().getDate();
  if (day.value !== currentDay) {
    day.value = currentDay;
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    updateDay();
  }
}

onMounted(() => {
  updateDay();
  // Check every minute if the date changed
  intervalId = setInterval(updateDay, 60000);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  clearInterval(intervalId);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style scoped>
svg {
  height: 35px;
  width: auto;
  display: block;
}
</style>