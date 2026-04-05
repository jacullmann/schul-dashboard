<script setup lang="ts">
import { Mail, Github, MessageCircle } from '@lucide/vue';

const { t } = useI18n();

useSeoMetaWithI18n({
  title: () => `${t('pages.contact.title')} — schul-dashboard`,
  description: () => t('pages.contact.description'),
  keywords: 'contact, support, email',
  canonicalUrl: 'https://schul-dashboard.com/contact',
});

// TODO: Update with your actual contact information
const contactMethods = [
  {
    icon: Mail,
    title: t('pages.contact.email_title'),
    description: t('pages.contact.email_description'),
    href: 'mailto:contact@schul-dashboard.com',
    value: 'contact@schul-dashboard.com',
  },
  {
    icon: Github,
    title: t('pages.contact.github_title'),
    description: t('pages.contact.github_description'),
    href: 'https://github.com/schul-dashboard',
    value: 'GitHub',
  },
  {
    icon: MessageCircle,
    title: t('pages.contact.discord_title'),
    description: t('pages.contact.discord_description'),
    href: 'https://discord.gg/schul-dashboard',
    value: 'Discord',
  },
];
</script>

<template>
  <div class="w-full">
    <!-- Hero -->
    <section class="w-full py-20 md:py-12">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h1 class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-surface leading-[1.2] mb-4">
          {{ t('pages.contact.title') }}
        </h1>
        <p class="text-lg text-on-surface-muted max-w-xl mx-auto">
          {{ t('pages.contact.description') }}
        </p>
      </div>
    </section>

    <!-- Contact Methods -->
    <section class="w-full py-16 md:py-12">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6 mb-12">
          <a
            v-for="method in contactMethods"
            :key="method.title"
            :href="method.href"
            target="_blank"
            rel="noopener noreferrer"
            class="bg-surface border border-surface-border rounded-xl p-7 flex flex-col gap-4 transition-all hover:border-surface-hover-border hover:bg-surface-hover-subtle hover:-translate-y-0.5 no-underline group"
          >
            <div class="w-12 h-12 rounded-lg bg-on-surface-muted/12 flex items-center justify-center text-on-surface-muted group-hover:text-on-surface transition-colors">
              <component :is="method.icon" :size="24" aria-hidden="true" />
            </div>
            <div>
              <h3 class="text-title font-semibold text-on-surface m-0 font-display">
                {{ method.title }}
              </h3>
              <p class="text-sm text-on-surface-muted mt-1 m-0">
                {{ method.description }}
              </p>
            </div>
            <span class="text-sm font-medium text-on-surface-muted group-hover:text-on-surface transition-colors">
              {{ method.value }} →
            </span>
          </a>
        </div>

        <!-- TODO: Add contact form here -->
        <div class="bg-surface border border-surface-border rounded-xl p-12 text-center">
          <h2 class="text-xl font-bold font-display text-on-surface mb-3">
            {{ t('pages.contact.form_title') }}
          </h2>
          <p class="text-on-surface-muted mb-6">
            {{ t('pages.contact.form_description') }}
          </p>
          <form class="max-w-md mx-auto flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="name" class="text-sm font-medium text-on-surface">
                {{ t('pages.contact.form_name') }}
              </label>
              <input
                id="name"
                type="text"
                class="px-4 py-2 rounded-lg bg-canvas border border-canvas-border text-on-surface placeholder-on-surface-muted focus:outline-none focus:border-surface-hover-border focus:ring-1 focus:ring-surface-hover-border"
                :placeholder="t('pages.contact.form_name_placeholder')"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="email" class="text-sm font-medium text-on-surface">
                {{ t('pages.contact.form_email') }}
              </label>
              <input
                id="email"
                type="email"
                class="px-4 py-2 rounded-lg bg-canvas border border-canvas-border text-on-surface placeholder-on-surface-muted focus:outline-none focus:border-surface-hover-border focus:ring-1 focus:ring-surface-hover-border"
                :placeholder="t('pages.contact.form_email_placeholder')"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="message" class="text-sm font-medium text-on-surface">
                {{ t('pages.contact.form_message') }}
              </label>
              <textarea
                id="message"
                rows="5"
                class="px-4 py-2 rounded-lg bg-canvas border border-canvas-border text-on-surface placeholder-on-surface-muted focus:outline-none focus:border-surface-hover-border focus:ring-1 focus:ring-surface-hover-border resize-none"
                :placeholder="t('pages.contact.form_message_placeholder')"
              />
            </div>

            <button
              type="submit"
              class="px-6 py-3 rounded-lg bg-action text-on-action font-semibold transition-all hover:bg-action-hover"
            >
              {{ t('pages.contact.form_submit') }}
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <CTASection />
  </div>
</template>
