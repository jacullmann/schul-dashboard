<script setup lang="ts">
const { t } = useI18n();

interface Feature {
  icon: string;
  titleKey: string;
  descKey: string;
  accent: 'green' | 'red' | 'indigo' | 'purple' | 'amber' | 'teal';
}

// TODO: Import icons dynamically or use slot-based system
// Import lucide icons here as needed
const features: Feature[] = [
  {
    icon: 'Banknote',
    titleKey: 'sections.features.item0.title',
    descKey: 'sections.features.item0.description',
    accent: 'green',
  },
  {
    icon: 'EyeOff',
    titleKey: 'sections.features.item1.title',
    descKey: 'sections.features.item1.description',
    accent: 'red',
  },
  {
    icon: 'ShieldCheck',
    titleKey: 'sections.features.item2.title',
    descKey: 'sections.features.item2.description',
    accent: 'indigo',
  },
  {
    icon: 'Users',
    titleKey: 'sections.features.item3.title',
    descKey: 'sections.features.item3.description',
    accent: 'purple',
  },
  {
    icon: 'ClipboardList',
    titleKey: 'sections.features.item4.title',
    descKey: 'sections.features.item4.description',
    accent: 'amber',
  },
  {
    icon: 'Calendar',
    titleKey: 'sections.features.item5.title',
    descKey: 'sections.features.item5.description',
    accent: 'teal',
  },
];
</script>

<template>
  <section class="w-full py-16 md:py-12">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <!-- Section Header -->
      <div class="text-center mb-16 md:mb-12">
        <div class="inline-block px-3.5 py-1 rounded-full bg-surface border border-surface-border text-footnote font-semibold text-on-surface-muted uppercase tracking-wider mb-4">
          {{ t('sections.features.badge') }}
        </div>
        <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-on-surface mx-auto font-display leading-[1.25] max-w-[520px]">
          {{ t('sections.features.title') }}
        </h2>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6">
        <article
          v-for="(feature, idx) in features"
          :key="`feature-${idx}`"
          class="bg-surface border border-surface-border rounded-xl p-7 flex flex-col gap-3 transition-all hover:border-surface-hover-border hover:bg-surface-hover-subtle hover:-translate-y-0.5"
        >
          <!-- TODO: Replace with dynamic icon component -->
          <div
            class="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-on-surface-muted/12"
            :class="[
              {
                'bg-green/12': feature.accent === 'green',
                'bg-coral/12': feature.accent === 'red',
              }
            ]"
            aria-hidden="true"
          >
            📌
          </div>

          <h3 class="text-title font-semibold text-on-surface m-0 font-display">
            {{ t(feature.titleKey) }}
          </h3>
          <p class="text-sub text-on-surface-muted leading-[1.7] m-0">
            {{ t(feature.descKey) }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
article {
  transition: all 200ms ease;
}
</style>
