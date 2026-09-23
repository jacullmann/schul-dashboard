<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <PageChapter :label="t('home.principles.label')">
    <div class="col-span-12 flex flex-col items-start gap-10 lg:col-span-9">
      <p class="font-serif text-statement">
        {{ t('home.principles.lead') }}
        <span class="text-on-ghost-subtle">{{ t('home.principles.rest') }}</span>
      </p>
      <NuxtLink
        :to="localePath('about')"
        class="group inline-flex items-center gap-2 text-[0.9375rem] font-medium"
      >
        <span class="link-underline">{{ t('home.principles.link') }}</span>
        <ArrowRight
          :size="16"
          :stroke-width="1.75"
          class="transition-transform duration-200 ease-out-quint group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </NuxtLink>
    </div>
  </PageChapter>
</template>
