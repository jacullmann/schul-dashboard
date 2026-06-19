<script setup lang="ts">
import { Mail, MessageCircle, ArrowRight } from '@lucide/vue';

const { t } = useI18n();

useSeoMetaWithI18n({
  title: () => `${t('pages.contact.title')} — schul-dashboard`,
  description: () => t('pages.contact.description'),
  keywords: 'contact, support, email, discord',
  canonicalUrl: 'https://schul-dashboard.com/contact',
});

const contactMethods = [
  {
    icon: Mail,
    key: 'email',
    href: 'mailto:contact@schul-dashboard.com',
    value: 'contact@schul-dashboard.com',
  },
  {
    icon: MessageCircle,
    key: 'discord',
    href: 'https://discord.gg/schul-dashboard',
    value: 'Discord',
  },
];
</script>

<template>
  <div class="w-full">
    <section class="w-full py-20 md:py-14 border-b border-ghost-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h1
          class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-ghost leading-[1.15] mb-5"
        >
          {{ t('pages.contact.title') }}
        </h1>
        <p class="text-lg text-on-ghost-muted leading-[1.65]">
          {{ t('pages.contact.description') }}
        </p>
      </div>
    </section>

    <section class="w-full py-20 md:py-14">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="grid grid-cols-2 md:grid-cols-1 gap-5 max-w-2xl mx-auto">
          <a
            v-for="method in contactMethods"
            :key="method.key"
            :href="method.href"
            target="_blank"
            rel="noopener noreferrer"
            class="group bg-surface border border-ghost-border rounded-xl p-8 flex flex-col gap-5 no-underline transition-all hover:border-surface-hover-border hover:bg-surface-highlight hover:-translate-y-px"
          >
            <div
              class="w-12 h-12 rounded-xl bg-canvas border border-ghost-border flex items-center justify-center text-on-ghost-muted group-hover:text-on-ghost transition-colors"
            >
              <component :is="method.icon" :size="22" aria-hidden="true" />
            </div>
            <div class="flex-1">
              <h2 class="text-lg font-semibold text-on-ghost font-display mb-1.5">
                {{ t(`pages.contact.${method.key}_title`) }}
              </h2>
              <p class="text-sm text-on-ghost-muted m-0 leading-[1.6]">
                {{ t(`pages.contact.${method.key}_description`) }}
              </p>
            </div>
            <div
              class="flex items-center gap-2 text-sm font-medium text-on-ghost-muted group-hover:text-on-ghost transition-colors"
            >
              {{ method.value }}
              <ArrowRight
                :size="14"
                class="transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
