<script setup lang="ts">
const { t } = useI18n();

const reasons = [
  { numberKey: 'reasons.reason0Number', textKey: 'reasons.reason0Text' },
  { numberKey: 'reasons.reason1Number', textKey: 'reasons.reason1Text' },
  { numberKey: 'reasons.reason2Number', textKey: 'reasons.reason2Text' },
  { numberKey: 'reasons.reason3Number', textKey: 'reasons.reason3Text' },
] as const;
</script>

<template>
  <section id="welcome-section" class="flex flex-col gap-20 w-full max-w-[800px] px-4 py-20 mx-auto">

    <!-- Block 1: Paper vs Digital comparison -->
    <div class="flex flex-col gap-5">
      <h2 class="font-sans text-[clamp(1.35rem,3vw,1.75rem)] font-normal m-0 leading-[1.45] text-on-surface-muted">
        {{ t('comparison.headline.before') }}<span class="bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t('comparison.headline.highlight1') }}</span>{{ t('comparison.headline.mid') }}<span class="bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t('comparison.headline.highlight2') }}</span>{{ t('comparison.headline.end') }}
      </h2>
      <ClientOnly>
        <ImageComparison />
      </ClientOnly>
      <p class="text-footnote text-on-surface-muted m-0">{{ t('comparison.attribution') }}</p>
    </div>

    <!-- Block 2: By students for students + reasons grid -->
    <div class="flex flex-col gap-5">
      <h2 class="font-sans text-[clamp(1.35rem,3vw,1.75rem)] font-normal m-0 leading-[1.45] text-on-surface-muted">
        <span class="bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t('reasons.byStudentsForStudents.highlight1') }}</span>{{ t('reasons.byStudentsForStudents.mid') }}<span class="bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t('reasons.byStudentsForStudents.highlight2') }}</span>{{ t('reasons.byStudentsForStudents.suffix') }}
      </h2>
      <p class="text-sub font-semibold uppercase tracking-[0.07em] text-on-surface-muted m-0">{{ t('reasons.why') }}</p>
      <div class="grid grid-cols-2 sm:grid-cols-1">
        <div v-for="(reason, i) in reasons" :key="i" class="flex flex-col gap-1 py-5 border-b border-surface-border" :class="{ 'border-r pr-6 sm:border-r-0 sm:pr-0': i % 2 === 0, 'pl-6 sm:pl-0': i % 2 === 1, 'border-b-0': i >= 2 }">
          <span class="font-display text-[clamp(2rem,5vw,3rem)] font-black leading-none bg-clip-text text-transparent" :style="{ backgroundImage: 'var(--background-image-bismuth)' }">{{ t(reason.numberKey) }}</span>
          <span class="text-body text-on-surface-muted font-medium">{{ t(reason.textKey) }}</span>
        </div>
      </div>
    </div>

  </section>
</template>
