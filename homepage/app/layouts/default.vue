<template>
  <div class="flex min-h-dvh flex-col">
    <HomepageHeader />
    <main class="flex-1">
      <slot />
    </main>
    <HomepageFooter />
  </div>
</template>
