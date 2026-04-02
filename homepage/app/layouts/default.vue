<script setup lang="ts">
</script>

<template>
  <div class="page-shell">
    <header class="header-container">
      <TheHeader />
    </header>

    <main class="main-content">
      <div class="hero-bg" aria-hidden="true" />
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

.header-container {
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-menu);
}

.main-content {
  flex: 1;
  position: relative;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 95vh;
  background-image: url('/background_image.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
}

:global(:root.light) .hero-bg {
  display: none;
}

@media (max-width: 1200px) {
  .hero-bg { display: none; }
}

.main-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}
</style>
