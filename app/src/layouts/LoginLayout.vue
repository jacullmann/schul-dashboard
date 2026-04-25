<template>
  <div class="flex min-h-screen w-full flex-col bg-canvas">
    <header class="w-full px-6 py-4">
      <div class="flex items-center gap-4">
        <AppLogo class="h-[50px] w-auto" />
        <span
          class="text-h2 font-bold transition-opacity duration-200 ease-in hover:opacity-80"
        >
          Schul-Dashboard
        </span>
        <!-- TODO: implement theme and language switch -->
      </div>
    </header>
    <main class="flex flex-1 items-center justify-center p-6">
      <router-view />
    </main>
  </div>
</template>
