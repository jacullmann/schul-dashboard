<script setup lang="ts">
const { t } = useI18n();

const details = ['roles', 'invites', 'many'] as const;
</script>

<template>
  <PageChapter :label="t('home.groups.label')">
    <h2 class="sr-only">{{ t('home.groups.title') }}</h2>

    <div
      class="col-span-12 grid grid-cols-[auto_1fr] items-end gap-x-[clamp(1.5rem,6vw,6rem)] lg:col-span-9"
      aria-hidden="true"
    >
      <span class="pt-[0.08em] font-serif text-numeral">1</span>
      <span class="pt-[0.08em] font-serif text-numeral">30</span>
      <p class="mt-6 max-w-[14rem] text-lede text-on-ghost-muted">{{ t('home.groups.one') }}</p>
      <p class="mt-6 max-w-[14rem] text-lede text-on-ghost-muted">{{ t('home.groups.thirty') }}</p>
    </div>

    <dl
      class="col-span-12 m-0 grid gap-x-gutter gap-y-8 sm:grid-cols-3 lg:col-span-9 lg:col-start-4"
    >
      <div v-for="detail in details" :key="detail" class="flex flex-col gap-2">
        <dt class="text-[0.9375rem] font-semibold">
          {{ t(`home.groups.details.${detail}.title`) }}
        </dt>
        <dd class="m-0 text-[0.9375rem] leading-relaxed text-on-ghost-muted">
          {{ t(`home.groups.details.${detail}.body`) }}
        </dd>
      </div>
    </dl>
  </PageChapter>
</template>
