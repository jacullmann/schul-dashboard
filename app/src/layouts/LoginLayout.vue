<template>
  <div class="flex min-h-screen w-full flex-col bg-canvas">
    <header class="w-full px-6 py-2">
      <div class="flex items-center justify-center text-2xl font-bold">
        schul-dashboard
        <!-- TODO: implement theme and language switch -->
      </div>
    </header>
    <main class="flex flex-1 items-center justify-center py-4 px-6">
      <router-view />
    </main>
  </div>
</template>
