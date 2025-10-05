<template>
  <svg
      v-bind="$attrs"
      version="1.1"
      id="svg1"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <defs>
      <linearGradient id="linearGradient1-1">
        <stop style="stop-color:#ffa91a;stop-opacity:1;" offset="0.07171854" />
        <stop style="stop-color:#ff335a;stop-opacity:1;" offset="0.40121785" />
        <stop style="stop-color:#af00ff;stop-opacity:1;" offset="0.69113672" />
        <stop style="stop-color:#5600ff;stop-opacity:1;" offset="1" />
      </linearGradient>
      <linearGradient xlink:href="#linearGradient1-1" id="linearGradient2"
                      x1="46.99826" y1="-101.90965" x2="1054.62" y2="375.45285"
                      gradientUnits="userSpaceOnUse" />
      <mask id="mask-powermask-path-effect11" maskUnits="userSpaceOnUse">
        <path id="mask-powermask-path-effect11_box" style="fill:#ffffff;fill-opacity:1"
              d="M 65.816826,65.816826 H 958.18322 V 958.18316 H 65.816826 Z" />
        <g id="g11" style="fill:#000000;fill-opacity:1">
          <rect id="rect10" style="fill:#000000" height="277.78479" x="192" y="165.10788" ry="48" width="96" />
          <rect id="rect11" style="fill:#000000" height="277.78479" x="736" y="165.10788" ry="48" width="96" />
          <text xml:space="preserve"
                :style="textStyle"
                x="511.48108"
                y="864.30536"
                id="text11">
            <tspan id="tspan11" x="511.48108" y="864.30536" text-anchor="middle">{{ dayString }}</tspan>
          </text>
        </g>
      </mask>
    </defs>

    <g id="g1">
      <g id="g13" :mask="'url(#mask-powermask-path-effect11)'" style="fill:#ffffff;fill-opacity:1"
         transform="matrix(1.1475934,0,0,1.1475934,-75.604709,-75.604715)">
        <path id="rect2" style="display:inline;fill:#ffffff;fill-opacity:1"
              d="m 957.18322,352 v 477.18316 c 0,70.912 -57.088,128 -128,128 H 194.81683 c -70.912,0 -128.000025,-57.088 -128.000004,-128 L 66.81698,352 Z" />
        <path id="path2" style="display:inline;fill:url(#linearGradient2)"
              d="m 194.81683,66.816826 h 634.36639 c 70.912,0 128,57.088004 128,128.000004 V 256 H 66.817 v -61.18317 c 0,-70.912 57.08783,-128.000004 127.99983,-128.000004 z" />
      </g>
      <path id="mask-powermask-path-effect15_box" style="display:none;fill:#ffffff;fill-opacity:1"
            d="M 65.816826,65.816826 H 958.18322 V 958.18316 H 65.816826 Z" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const day = ref<number>(getToday());
const dayString = computed(() => String(day.value)); // falls führende Null gewünscht: padStart(2,'0')

function getToday(): number {
  return new Date().getDate();
}

function setDayNow() {
  day.value = getToday();
}

function msUntilNextMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.getTime() - now.getTime();
}

let midnightTimeout: number | undefined;
let dailyInterval: number | undefined;

onMounted(() => {
  setDayNow();
  // Timeout bis Mitternacht, dann alle 24h updaten
  midnightTimeout = window.setTimeout(() => {
    setDayNow();
    dailyInterval = window.setInterval(setDayNow, 24 * 60 * 60 * 1000);
  }, msUntilNextMidnight());
});

onUnmounted(() => {
  if (midnightTimeout) window.clearTimeout(midnightTimeout);
  if (dailyInterval) window.clearInterval(dailyInterval);
});

// Stil als reactive Objekt, so kannst du Schriftgröße zentral anpassen
const textStyle = {
  fontSize: '557.689px',
  lineHeight: '0.1',
  fontFamily: "'Roboto Slab', Roboto, sans-serif",
  fontWeight: '900',
  fill: '#000000',
  strokeWidth: '4.94016',
  textAnchor: 'middle'
} as Record<string,string>;
</script>

<style scoped>
svg { height: 35px; width: auto; display: block; }
</style>
