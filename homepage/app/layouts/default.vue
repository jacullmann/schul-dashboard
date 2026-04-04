<script setup lang="ts">
</script>

<template>
  <div class="page-shell">
    <header class="header-container">
      <TheHeader />
    </header>

    <main class="main-content">
      <!-- CSS gradient mesh — visible in dark mode only, replaces webp background -->
      <div class="hero-mesh" aria-hidden="true" />
      <div class="main-inner">
        <slot />
      </div>
    </main>

    <TheFooter />
  </div>
</template>

<style scoped>
.page-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-canvas);
}

/* Sticky header with proper z-index */
.header-container {
  position: sticky;
  top: 0;
  z-index: 200;
}

.main-content {
  flex: 1;
  position: relative;
}

/*
  Gradient mesh background.
  Multiple radial-gradients using brand bismuth colours at very low opacity.
  Pure CSS – no external image, works in both SSR and CSR, hidden in light mode.
*/
.hero-mesh {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background:
    radial-gradient(ellipse 70% 55% at 75% -5%,  rgba(175, 0, 255, 0.10) 0%, transparent 62%),
    radial-gradient(ellipse 55% 45% at 15% 35%,  rgba(255, 169, 26, 0.07) 0%, transparent 60%),
    radial-gradient(ellipse 45% 35% at 88% 60%,  rgba(255, 51, 90, 0.06)  0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 40% 90%,  rgba(86, 0, 255, 0.05)   0%, transparent 58%);
  z-index: 0;
  pointer-events: none;
}

/* Hide the mesh in light mode and on narrow screens where it's unnecessary */
:global(:root.light) .hero-mesh { display: none; }

@media (max-width: 900px) {
  .hero-mesh { display: none; }
}

.main-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0;
}
</style>
