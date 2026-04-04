<script setup lang="ts">
const { t } = useI18n();

const stats = [
  { valueKey: 'stats.stat0Value', labelKey: 'stats.stat0Label' },
  { valueKey: 'stats.stat1Value', labelKey: 'stats.stat1Label' },
  { valueKey: 'stats.stat2Value', labelKey: 'stats.stat2Label' },
  { valueKey: 'stats.stat3Value', labelKey: 'stats.stat3Label' },
] as const;
</script>

<template>
  <section class="w-full max-w-[1100px] mx-auto py-16 px-4 border-t border-b border-surface-border">
    <p class="text-center text-sub font-semibold text-on-surface-muted uppercase tracking-[0.08em] mb-10">{{ t('stats.title') }}</p>
    <div class="grid grid-cols-4 gap-6 text-center md:grid-cols-2 sm:grid-cols-1">
      <div v-for="(stat, i) in stats" :key="i" class="flex flex-col items-center gap-1.5">
        <span class="text-[clamp(2rem,4vw,2.75rem)] font-black font-display leading-none bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t(stat.valueKey) }}</span>
        <span class="text-sub text-on-surface-muted font-medium leading-[1.4]">{{ t(stat.labelKey) }}</span>
      </div>
    </div>
  </section>
</template>
