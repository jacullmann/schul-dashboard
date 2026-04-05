<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

/**
 * TODO: Hero Section
 * - Replace placeholder content with your hero message
 * - Update i18n keys in locales
 * - Add proper CTA links
 * - Consider adding animated background or video
 */
</script>

<template>
  <section class="relative w-full min-h-[calc(100vh_-_56px)] py-16 flex items-center justify-center">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <!-- Decorative background elements (dark mode) -->
      <div
        class="absolute -top-[120px] right-[8%] w-[560px] h-[560px] rounded-full pointer-events-none filter blur-[96px] hidden dark:block"
        style="background: radial-gradient(circle, var(--color-bismuth-purple) 0%, transparent 70%); opacity: 0.09"
        aria-hidden="true"
      />
      <div
        class="absolute -bottom-[80px] left-[3%] w-[420px] h-[420px] rounded-full pointer-events-none filter blur-[96px] hidden dark:block"
        style="background: radial-gradient(circle, var(--color-bismuth-yellow) 0%, transparent 70%); opacity: 0.07"
        aria-hidden="true"
      />

      <!-- Hero Content -->
      <div class="relative z-10 flex flex-col lg:flex-row items-center gap-10">
        <!-- Left Column: Copy -->
        <div class="flex-1 text-center lg:text-left">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.25 rounded-full bg-surface border border-surface-border text-footnote font-medium text-on-surface-muted tracking-wider mb-6 justify-center lg:justify-start w-full lg:w-auto">
            <span class="relative inline-block w-2 h-2 flex-shrink-0">
              <span class="absolute inset-0 rounded-full bg-green animate-pulse" aria-hidden="true" />
            </span>
            {{ t('sections.hero.badge') }}
          </div>

          <h1 class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-surface leading-[1.2] mb-4">
            {{ t('sections.hero.title') }}
          </h1>

          <p class="text-lg text-on-surface-muted leading-[1.6] mb-8 max-w-md mx-auto lg:mx-0">
            {{ t('sections.hero.description') }}
          </p>

          <!-- CTAs -->
          <div class="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <NuxtLink
              :to="localePath('index')"
              class="px-6 py-3 rounded-lg bg-action text-on-action font-semibold transition-all hover:bg-action-hover inline-flex items-center justify-center gap-2"
            >
              {{ t('sections.hero.cta_primary') }}
            </NuxtLink>
            <button
              type="button"
              class="px-6 py-3 rounded-lg border border-surface-border text-on-surface font-semibold transition-all hover:border-surface-hover-border hover:bg-surface-hover-subtle inline-flex items-center justify-center gap-2"
            >
              {{ t('sections.hero.cta_secondary') }}
            </button>
          </div>
        </div>

        <!-- Right Column: Visual (placeholder) -->
        <div class="flex-1 w-full max-w-md">
          <div class="aspect-square bg-surface border border-surface-border rounded-2xl flex items-center justify-center text-on-surface-muted">
            <!-- TODO: Add hero visual - image, video, or 3D visualization -->
            <div class="text-center">
              <div class="text-4xl mb-3">🎯</div>
              <p class="text-sm">{{ t('sections.hero.placeholder') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

