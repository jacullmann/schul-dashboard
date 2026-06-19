<script setup lang="ts">
import { ClipboardList, CalendarDays, Users, Lock, Shield, Search } from '@lucide/vue';

const { t } = useI18n();

useSeoMetaWithI18n({
  title: () => `${t('pages.features.title')} — schul-dashboard`,
  description: () => t('pages.features.description'),
  keywords: 'features, tasks, schedule, groups, private notes, security, search',
  canonicalUrl: 'https://schul-dashboard.com/features',
});

const features = [
  {
    key: 'tasks',
    color: 'text-green',
  },
  {
    key: 'schedule',
    color: 'text-bismuth-purple',
  },
  {
    key: 'groups',
    color: 'text-bismuth-yellow',
  },
  {
    key: 'private',
    color: 'text-bismuth-red',
  },
  {
    key: 'security',
    color: 'text-green',
  },
  {
    key: 'search',
    color: 'text-bismuth-purple',
  },
];
</script>

<template>
  <div class="w-full">
    <section class="w-full py-20 md:py-14 border-b border-ghost-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h1
          class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-ghost leading-[1.15] mb-5 max-w-2xl mx-auto"
        >
          {{ t('pages.features.title') }}
        </h1>
        <p class="text-lg text-on-ghost-muted leading-[1.65]">
          {{ t('pages.features.description') }}
        </p>
      </div>
    </section>

    <section class="w-full py-20 md:py-14">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="flex flex-col gap-12">
          <article
            v-for="(feature, idx) in features"
            :key="feature.key"
            class="flex flex-col md:flex-row gap-10 items-start"
            :class="idx % 2 === 1 ? 'md:flex-row-reverse' : ''"
          >
            <div class="flex-1">
              <h2 class="text-2xl font-bold font-display text-on-ghost mb-3">
                {{ t(`pages.features.${feature.key}.title`) }}
              </h2>
              <p class="text-on-ghost-muted leading-[1.7] max-w-2xl">
                {{ t(`pages.features.${feature.key}.description`) }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <CTASection />
  </div>
</template>

