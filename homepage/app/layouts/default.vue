<template>
  <div class="min-h-screen flex flex-col">
    <HomepageHeader />
    <main class="flex-1">
      <slot />
    </main>
    <HomepageFooter />
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>
