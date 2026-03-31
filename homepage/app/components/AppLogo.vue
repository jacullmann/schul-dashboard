<script setup lang="ts">
</script>

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
      <linearGradient id="hp-bismuth-stops">
        <stop style="stop-color: var(--color-bismuth-yellow);" offset="8.4%" />
        <stop style="stop-color: var(--color-bismuth-red);" offset="38.4%" />
        <stop style="stop-color: var(--color-bismuth-purple);" offset="69.1%" />
        <stop style="stop-color: var(--color-bismuth-violet);" offset="100%" />
      </linearGradient>
      <linearGradient
        xlink:href="#hp-bismuth-stops"
        id="hp-bismuth"
        x1="58.46209" y1="-160.82309"
        x2="1114.1292" y2="333.66876"
        gradientUnits="userSpaceOnUse"
      />
    </defs>
    <path
      style="fill: var(--color-onyx);"
      d="M 0,160 1.3117412e-4,475.00447 1023.9999,472.56856 1024,159.87511 853.47687,44.06984 173.10682,43.669109 Z"
    />
    <path
      style="fill: var(--color-white);"
      d="M -3.5732999e-7,352 V 896 A 128,128 0 0 0 128,1024 H 896 A 128,128 0 0 0 1024,896 V 352 a 32,32 0 0 0 -32,-32 h -64 a 32,32 0 0 0 -32,32 v 32 a 48,48 0 0 1 -48,48 48,48 0 0 1 -48,-48 V 352 A 32,32 0 0 0 768,320 H 256 a 32,32 0 0 0 -32,32 v 32 a 48,48 0 0 1 -48,48 48,48 0 0 1 -48,-48 V 352 A 32,32 0 0 0 96,320 H 32 A 32,32 0 0 0 -3.5732999e-7,352 Z"
    />
    <path
      style="fill: url(#hp-bismuth);"
      d="m -3.5732999e-7,128 v 64 A 32,32 0 0 0 32,224 h 64 a 32,32 0 0 0 32,-32 v -32 a 48,48 0 0 1 48,-48 48,48 0 0 1 48,48 v 32 a 32,32 0 0 0 32,32 h 512 a 32,32 0 0 0 32,-32 v -32 a 48,48 0 0 1 48,-48 48,48 0 0 1 48,48 v 32 a 32,32 0 0 0 32,32 h 64 a 32,32 0 0 0 32,-32 V 128 A 128,128 0 0 0 896,-3.5732999e-7 H 128 A 128,128 0 0 0 -3.5732999e-7,128 Z"
    />
    <text
      style="font-weight: 900; font-size: 560px; font-family: Inter, sans-serif; fill: var(--color-onyx); text-anchor: middle;"
    >
      <tspan x="512" y="880" text-anchor="middle">30</tspan>
    </text>
  </svg>
</template>

<style scoped>
svg {
  height: 35px;
  width: auto;
  display: block;
}
</style>
