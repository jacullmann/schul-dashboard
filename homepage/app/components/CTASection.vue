<script setup lang="ts">
const { t } = useI18n();
const config = useRuntimeConfig();
</script>

<template>
  <section class="w-full max-w-[1100px] mx-auto px-4 py-20">
    <div class="relative border border-surface-border rounded-2xl bg-surface overflow-hidden px-12 py-20 md:px-6 text-center">
      <!-- Gradient glow background -->
      <div class="absolute inset-0 hidden dark:block pointer-events-none"
        style="background: radial-gradient(ellipse 70% 50% at 50% -5%, rgba(175, 0, 255, 0.1) 0%, transparent 65%), radial-gradient(ellipse 40% 30% at 10% 110%, rgba(255, 169, 26, 0.07) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 90% 110%, rgba(86, 0, 255, 0.07) 0%, transparent 60%);" />
      <div class="absolute inset-0 block dark:hidden pointer-events-none" style="background: radial-gradient(ellipse 70% 50% at 50% -5%, rgba(175, 0, 255, 0.04) 0%, transparent 65%);" />

      <div class="relative z-1 flex flex-col items-center gap-4 max-w-[600px] mx-auto">
        <h2 class="text-[clamp(1.75rem,4vw,2.5rem)] font-black text-on-surface m-0 tracking-tight leading-[1.2]">{{ t('cta.title') }}</h2>
        <p class="text-[1.125rem] text-on-surface-muted m-0 leading-[1.6]">{{ t('cta.subtitle') }}</p>
        <div class="flex gap-3 flex-wrap justify-center mt-2 sm:flex-col sm:items-stretch">
          <a :href="config.public.loginUrl || '#'" class="inline-flex items-center px-7 py-3 rounded-md bg-action text-on-action text-body font-bold no-underline transition-all hover:bg-action-hover hover:-translate-y-0.5 sm:text-center sm:justify-center">
            {{ t('cta.primary') }}
          </a>
          <NuxtLink to="/about" class="inline-flex items-center px-6 py-3 rounded-md bg-transparent text-on-surface-muted text-body font-medium no-underline border border-surface-border transition-all hover:text-on-surface hover:border-surface-hover-border sm:text-center sm:justify-center">
            {{ t('cta.secondary') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
