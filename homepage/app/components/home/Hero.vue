<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';

const { t } = useI18n();
const appLinks = useAppLinks();
</script>

<template>
  <section class="page pt-intro">
    <div class="page-grid gap-y-10">
      <h1 class="col-span-12 font-serif text-display lg:col-span-10">
        <i18n-t keypath="home.hero.title" scope="global">
          <template #emphasis>
            <em>{{ t('home.hero.title_emphasis') }}</em>
          </template>
        </i18n-t>
      </h1>

      <div class="col-span-12 flex flex-col gap-8 md:col-span-7 lg:col-span-5 lg:col-start-7">
        <p class="text-lede text-on-ghost-muted">{{ t('home.hero.lede') }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <BaseButton
            :href="appLinks.register"
            target="_self"
            variant="action"
            size="lg"
            :icon="ArrowRight"
          >
            {{ t('common.getStarted') }}
          </BaseButton>
          <BaseButton :href="appLinks.login" target="_self" size="lg">
            {{ t('common.login') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div class="mt-figure">
      <HomeTimetablePoster />
      <p class="mt-4 max-w-prose text-label text-on-ghost-subtle">
        {{ t('home.hero.caption') }}
      </p>
    </div>
  </section>
</template>
