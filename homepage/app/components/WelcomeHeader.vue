<template>
  <header class="header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo-link" aria-label="schul-dashboard – zur Startseite">
        <AppLogo class="logo-img" />
        <span class="logo-text">schul-dashboard</span>
      </NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.header {
  width: 100%;
  padding: 12px;
  background-color: var(--color-canvas);
  border-bottom: 1px solid var(--color-canvas-border);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}

.header-inner {
  width: 100%;
  max-width: 1400px;
  display: flex;
  align-items: center;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-decoration: none;
}

.logo-img {
  height: 32px;
  width: auto;
}

.logo-text {
  font-weight: bold;
  font-size: 1.6rem;
  white-space: nowrap;
  line-height: 32px;
  font-family: var(--font-display), sans-serif;
  color: var(--color-on-surface);
}

@media (max-width: 368px) {
  .logo-text {
    font-size: 1.25rem;
    line-height: 26px;
  }
  .logo-img {
    height: 26px;
  }
}
</style>
