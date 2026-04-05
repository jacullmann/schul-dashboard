<script setup lang="ts">
// The layout structure is now cleaner and more maintainable
// Header and Footer handle their own styling and responsiveness
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Header />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>

