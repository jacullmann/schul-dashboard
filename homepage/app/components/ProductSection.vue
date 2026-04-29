<script setup lang="ts">
import { ArrowRight, CheckCircle } from '@lucide/vue';

const { t } = useI18n();
const config = useRuntimeConfig();

const highlights = [
  'sections.product.highlight0',
  'sections.product.highlight1',
  'sections.product.highlight2',
  'sections.product.highlight3',
  'sections.product.highlight4',
];
</script>

<template>
  <section class="w-full py-24 md:py-16">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <div class="flex flex-col lg:flex-row items-center gap-16">
        <div class="flex-1 max-w-xl">
          <h2
            class="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold text-on-ghost font-display leading-[1.2] mb-5"
          >
            {{ t('sections.product.title') }}
          </h2>

          <p class="text-on-ghost-muted leading-[1.65] mb-8">
            {{ t('sections.product.description') }}
          </p>

          <ul class="flex flex-col gap-3 mb-10">
            <li
              v-for="key in highlights"
              :key="key"
              class="flex items-start gap-3 text-on-ghost-muted text-sm"
            >
              •
              <span>{{ t(key) }}</span>
            </li>
          </ul>
        </div>
        <a
          :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-action text-on-action font-semibold transition-all hover:bg-action-hover group"
        >
          {{ t('sections.product.cta') }}
          <ArrowRight
            :size="16"
            class="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </a>
      </div>
    </div>
  </section>
</template>

