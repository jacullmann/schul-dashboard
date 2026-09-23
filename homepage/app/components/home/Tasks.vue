<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <PageChapter :label="t('home.tasks.label')">
    <h2 class="col-span-12 font-serif text-headline lg:col-span-9">
      <i18n-t keypath="home.tasks.title" scope="global">
        <template #emphasis>
          <em>{{ t('home.tasks.title_emphasis') }}</em>
        </template>
      </i18n-t>
    </h2>

    <p class="col-span-12 text-lede text-on-ghost-muted md:col-span-6 lg:col-span-4 lg:col-start-4">
      {{ t('home.tasks.body') }}
    </p>

    <HomeTaskSpecimen class="col-span-12 md:col-span-6 lg:col-span-5 lg:col-start-8" />
  </PageChapter>
</template>
