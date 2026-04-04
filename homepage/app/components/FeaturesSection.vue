<template>
  <section class="w-full max-w-[1100px] px-4 py-20 md:py-12 mx-auto">
    <div class="text-center mb-13">
      <div class="inline-block px-3.5 py-1 rounded-full bg-surface border border-surface-border text-footnote font-semibold text-on-surface-muted uppercase tracking-wider mb-4">{{ t('features.title') }}</div>
      <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-on-surface mx-auto font-display leading-[1.25] max-w-[520px]">{{ t('features.subtitle') }}</h2>
    </div>

    <div class="grid grid-cols-3 gap-4 lg:grid-cols-2 sm:grid-cols-1">
      <div
        v-for="(feature, i) in features"
        :key="i"
        class="bg-surface border border-surface-border rounded-xl p-7 flex flex-col gap-3 transition-all hover:border-surface-hover-border hover:bg-surface-hover-subtle hover:-translate-y-0.5"
      >
        <div :class="[
          'w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0',
          {
            'bg-green/12 text-green': feature.accent === 'green',
            'bg-coral/12 text-coral': feature.accent === 'red',
            'bg-[rgba(86,0,255,0.12)] text-indigo-400 dark:text-indigo-600': feature.accent === 'indigo',
            'bg-[rgba(175,0,255,0.12)] text-bismuth-purple dark:text-purple-600': feature.accent === 'purple',
            'bg-bismuth-yellow/12 text-bismuth-yellow dark:text-amber-700': feature.accent === 'amber',
            'bg-[rgba(20,184,166,0.12)] text-teal-400 dark:text-teal-600': feature.accent === 'teal',
          }
        ]">
          <component :is="feature.icon" :size="22" aria-hidden="true" />
        </div>
        <h3 class="text-title font-semibold text-on-surface m-0 font-display">{{ t(feature.titleKey) }}</h3>
        <p class="text-sub text-on-surface-muted leading-[1.7] m-0">{{ t(feature.descKey) }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Banknote, EyeOff, ShieldCheck, Users, ClipboardList, Calendar } from '@lucide/vue';
import type { Component } from 'vue';

const { t } = useI18n();

interface Feature {
  icon: Component;
  titleKey: string;
  descKey: string;
  accent: 'green' | 'red' | 'indigo' | 'purple' | 'amber' | 'teal';
}

const features: Feature[] = [
  {
    icon: Banknote,
    titleKey: 'features.feature0Title',
    descKey: 'features.feature0Description',
    accent: 'green',
  },
  {
    icon: EyeOff,
    titleKey: 'features.feature1Title',
    descKey: 'features.feature1Description',
    accent: 'red',
  },
  {
    icon: ShieldCheck,
    titleKey: 'features.feature2Title',
    descKey: 'features.feature2Description',
    accent: 'indigo',
  },
  {
    icon: Users,
    titleKey: 'features.feature3Title',
    descKey: 'features.feature3Description',
    accent: 'purple',
  },
  {
    icon: ClipboardList,
    titleKey: 'features.feature4Title',
    descKey: 'features.feature4Description',
    accent: 'amber',
  },
  {
    icon: Calendar,
    titleKey: 'features.feature5Title',
    descKey: 'features.feature5Description',
    accent: 'teal',
  },
];
</script>
