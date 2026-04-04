<script setup lang="ts">
import { ref, onMounted } from 'vue';

const { t } = useI18n();

defineProps<{ onMoreInfoClick: () => void }>();

const config = useRuntimeConfig();
const isDarkMode = ref(true);

onMounted(() => {
  isDarkMode.value = !document.documentElement.classList.contains('light');
});

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('de', { dateStyle: 'short' }).format(new Date(dateString));
}
</script>

<template>
  <section class="relative flex flex-col lg:flex-row items-center max-w-[1600px] w-full min-h-[calc(100vh_-_56px)] gap-10 px-4 lg:px-16 py-16 lg:py-16 mx-auto mb-12 lg:mb-12 overflow-hidden" :style="{ containerType: 'inline-size' }">
    <!-- Decorative gradient orbs (dark mode only) -->
    <div class="absolute -top-[120px] right-[8%] w-[560px] h-[560px] rounded-full pointer-events-none filter blur-[96px] hidden dark:block" 
      :style="{ background: 'radial-gradient(circle, var(--color-bismuth-purple) 0%, transparent 70%)', opacity: '0.09' }" 
      aria-hidden="true" />
    <div class="absolute -bottom-[80px] left-[3%] w-[420px] h-[420px] rounded-full pointer-events-none filter blur-[96px] hidden dark:block"
      :style="{ background: 'radial-gradient(circle, var(--color-bismuth-yellow) 0%, transparent 70%)', opacity: '0.07' }"
      aria-hidden="true" />

    <!-- Copy column -->
    <div class="flex-1 text-on-surface">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.25 rounded-full bg-surface border border-surface-border text-footnote font-medium text-on-surface-muted tracking-wider mb-5.5">
        <span class="relative inline-block w-2 h-2 flex-shrink-0">
          <span class="absolute inset-0 rounded-full bg-green" 
            style="animation: pulse-dot 2s ease-out infinite" 
            aria-hidden="true" />
          <span class="absolute inset-0 rounded-full bg-green" aria-hidden="true" />
        </span>
        0€ &nbsp;·&nbsp; No Ads &nbsp;·&nbsp; AES-256 Encrypted
      </div>

      <h1 class="mb-0 text-left font-medium tracking-tight text-on-surface leading-[1.08]" style="font-size: 13.34cqw; font-size-adjust: 0.5; font-family: 'Noto Serif', serif;">
        {{ t('hero.headlineSerif') }}
      </h1>
      <h1 class="mb-0 text-left font-black tracking-tight text-on-surface leading-[1.08]" style="font-size: 13.34cqw;">
        {{ t('hero.headlineSans.before') }} <b class="bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t('hero.headlineSans.highlight') }}</b>
      </h1>

      <p class="text-[1.2rem] leading-[1.65] mt-5 text-on-surface-muted">
        {{ t('hero.subline') }}
        <strong class="font-bold text-on-surface">{{ t('hero.sublineHighlight') }}</strong>.
      </p>

      <div class="flex items-center gap-2 flex-wrap mt-8">
        <a :href="config.public.loginUrl || '#'" class="inline-flex items-center px-5.5 py-2.75 rounded-md bg-action text-on-action text-body font-semibold no-underline border-none cursor-pointer transition-all hover:bg-action-hover hover:-translate-y-0.5">
          {{ t('hero.cta') }}
        </a>
        <button type="button" class="inline-flex items-center gap-1.5 px-4.5 py-2.75 rounded-md bg-transparent text-on-surface-muted text-body font-medium border border-transparent cursor-pointer transition-all hover:text-on-surface hover:border-surface-border" @click="onMoreInfoClick">
          {{ t('hero.learnMore') }}
        </button>
      </div>
    </div>

    <!-- Dashboard preview column -->
    <div class="flex-1 flex justify-end items-center w-full lg:w-auto">
      <div class="w-full max-w-[580px] bg-surface border border-surface-border rounded-2xl overflow-hidden" 
        :class="isDarkMode ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_64px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)]' : 'shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_24px_64px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)]'"
        role="img" 
        aria-label="schul-dashboard preview">
        <!-- Window chrome -->
        <div class="flex items-center gap-0 px-3.5 py-2.75 border-b border-surface-border bg-canvas" aria-hidden="true">
          <div class="flex gap-1.5 flex-shrink-0">
            <span class="w-3 h-3 rounded-full" style="background: #ff5f57" />
            <span class="w-3 h-3 rounded-full" style="background: #febc2e" />
            <span class="w-3 h-3 rounded-full" style="background: #28c840" />
          </div>
          <span class="flex-1 text-center text-footnote font-semibold text-on-surface-muted font-display mr-[30px]">schul-dashboard</span>
        </div>

        <!-- Task list preview -->
        <div class="flex flex-col gap-2 p-3.5">
          <div class="flex items-start gap-3 bg-canvas border border-canvas-border rounded-lg p-3 transition-colors hover:border-canvas-border">
            <span class="w-4.5 h-4.5 rounded border-2 border-on-surface-muted flex-shrink-0 mt-0.5 inline-flex items-center justify-center bg-action border-action text-on-action" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <polyline points="2 6 5 9 10 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-title font-display text-on-surface-muted line-through whitespace-nowrap overflow-hidden text-ellipsis">{{ t('hero.items[0].title') }}</span>
            </div>
          </div>

          <div class="hidden lg:flex items-start gap-3 bg-canvas border border-canvas-border rounded-lg p-3 transition-colors hover:border-canvas-border">
            <span class="w-4.5 h-4.5 rounded border-2 border-on-surface-muted flex-shrink-0 mt-0.5 inline-flex" aria-hidden="true" />
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-title font-display text-on-surface whitespace-nowrap overflow-hidden text-ellipsis">{{ t('hero.items[1].title') }}</span>
              <span class="text-sub text-on-surface-muted">Erdkunde · {{ formatDate('2026-03-07') }}</span>
            </div>
          </div>

          <div class="flex items-start gap-3 bg-canvas border border-canvas-border rounded-lg p-3 transition-colors hover:border-canvas-border">
            <span class="w-4.5 h-4.5 rounded border-2 border-on-surface-muted flex-shrink-0 mt-0.5 inline-flex" aria-hidden="true" />
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-title font-display text-on-surface whitespace-nowrap overflow-hidden text-ellipsis">{{ t('hero.items[2].title') }}</span>
              <span class="text-sub text-on-surface-muted">Mathe · {{ formatDate('2026-03-08') }}</span>
              <span class="text-body text-on-surface break-words">{{ t('hero.items[2].text') }}</span>
            </div>
          </div>

          <div class="h-7 bg-gradient-to-t from-surface to-transparent mx-[-14px] mb-[-14px] rounded-b-2xl" aria-hidden="true" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes pulse-dot {
  0%    { transform: scale(1); opacity: 0.6; }
  100%  { transform: scale(2.4); opacity: 0; }
}

@media (max-width: 1024px) {
  section {
    flex-direction: column;
    padding: 40px 16px !important;
    gap: 32px;
    min-height: auto;
    margin-bottom: 32px;
  }
}

@media (max-width: 368px) {
  section {
    padding: 24px 12px !important;
  }
}
</style>
