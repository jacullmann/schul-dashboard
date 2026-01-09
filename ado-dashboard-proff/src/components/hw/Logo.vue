<template>
  <svg
      v-bind="$attrs"
      version="1.1"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <defs>
      <linearGradient id="logo-gradient-base">
        <stop style="stop-color: var(--primary--step1); stop-opacity: 1" offset="0.07171854" />
        <stop style="stop-color: var(--primary--step2); stop-opacity: 1" offset="0.40121785" />
        <stop style="stop-color: var(--primary--step3); stop-opacity: 1" offset="0.69113672" />
        <stop style="stop-color: var(--primary--step4); stop-opacity: 1" offset="1" />
      </linearGradient>
      <linearGradient
          xlink:href="#logo-gradient-base"
          :id="gradientId"
          x1="116.89321"
          y1="-72.786751"
          x2="982.60699"
          y2="334.15128"
          gradientUnits="userSpaceOnUse"
      />
      <mask maskUnits="userSpaceOnUse" :id="maskId">
        <path
            style="fill: #ffffff; fill-opacity: 1"
            d="M 65.816826,65.816826 H 958.18322 V 958.18316 H 65.816826 Z"
        />
        <g style="fill: #000000; fill-opacity: 1">
          <rect
              style="fill: #000000; fill-opacity: 1"
              height="277.78479"
              x="192"
              y="165.10788"
              ry="48"
              width="96"
          />
          <rect
              style="fill: #000000; fill-opacity: 1"
              height="277.78479"
              x="736"
              y="165.10788"
              ry="48"
              width="96"
          />
          <text
              x="512"
              y="864"
              :style="textStyle"
          >
            <tspan x="512" y="864" text-anchor="middle">{{ dayString }}</tspan>
          </text>
        </g>
      </mask>
    </defs>

    <g
        :mask="`url(#${maskId})`"
        style="fill: var(--color--white); fill-opacity: 1"
        transform="matrix(1.1500884,0,0,1.1500884,-76.845255,-76.845255)"
    >
      <path
          style="display: inline; fill: var(--color--white); fill-opacity: 1"
          d="m 957.18322,352 v 477.18316 c 0,70.912 -57.088,128 -128,128 H 194.81683 c -70.912,0 -128.000025,-57.088 -128.000004,-128 L 66.81698,352 Z"
      />
      <path
          :style="`display: inline; fill: url(#${gradientId})`"
          d="m 194.81683,66.816826 h 634.36639 c 70.912,0 128,57.088004 128,128.000004 V 256 H 66.817 v -61.18317 c 0,-70.912 57.08783,-128.000004 127.99983,-128.000004 z"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const instanceId = Math.random().toString(36).substring(2, 9);
const gradientId = `logo-gradient-${instanceId}`;
const maskId = `logo-mask-${instanceId}`;

const day = ref<number>(getToday());
const dayString = computed(() => String(day.value));

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
  midnightTimeout = window.setTimeout(() => {
    setDayNow();
    dailyInterval = window.setInterval(setDayNow, 24 * 60 * 60 * 1000);
  }, msUntilNextMidnight());
});

onUnmounted(() => {
  if (midnightTimeout) window.clearTimeout(midnightTimeout);
  if (dailyInterval) window.clearInterval(dailyInterval);
});

const textStyle = {
  fontWeight: '900',
  fontSize: '521.699px',
  lineHeight: '1.1',
  fontFamily: 'Inter, sans-serif',
  fill: '#000000',
  textAnchor: 'middle',
  dominantBaseline: 'auto'
} as Record<string, string>;
</script>

<style scoped>
svg {
  height: 35px;
  width: auto;
  display: block;
}
</style>