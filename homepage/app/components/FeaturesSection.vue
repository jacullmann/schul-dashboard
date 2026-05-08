<script setup lang="ts">
import { ClipboardList, Shield, UsersRound, Lock, Search, CalendarDays } from '@lucide/vue';

const { t } = useI18n();

const features = [
  { icon: ClipboardList, key: 'tasks' },
  { icon: CalendarDays, key: 'schedule' },
  { icon: UsersRound, key: 'groups' },
  { icon: Lock, key: 'private' },
  { icon: Shield, key: 'security' },
  { icon: Search, key: 'search' },
];
</script>

<template>
  <section class="w-full py-24 md:py-16">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <div class="text-center mb-16 md:mb-12">
        <h2
          class="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold text-on-ghost font-display leading-[1.2] max-w-xl mx-auto"
        >
          {{ t('sections.features.title') }}
        </h2>
        <p class="text-on-ghost-muted mt-4 leading-[1.6]">
          {{ t('sections.features.subtitle') }}
        </p>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-5">
        <article
          v-for="feature in features"
          :key="feature.key"
          class="bg-surface border border-surface-border rounded-2xl px-6 py-5 flex flex-col gap-4"
        >
          <div>
            <div class="flex gap-4 items-center">
              <component :is="feature.icon" aria-hidden="true" />
              <h3 class="text-lg font-semibold text-on-ghost font-display">
                {{ t(`sections.features.${feature.key}.title`) }}
              </h3>
            </div>
            <p class="leading-relaxed mt-2! mb-0!">
              {{ t(`sections.features.${feature.key}.description`) }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
