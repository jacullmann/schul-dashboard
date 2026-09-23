<script setup lang="ts">
const { t } = useI18n();

const extras = ['chat', 'private', 'search', 'devices'] as const;
</script>

<template>
  <PageChapter :label="t('home.extras.label')">
    <h2 class="col-span-12 font-serif text-title lg:col-span-7">
      {{ t('home.extras.title') }}
    </h2>

    <ul class="col-span-12 grid gap-x-gutter gap-y-10 sm:grid-cols-2 lg:col-span-9 lg:col-start-4">
      <li
        v-for="extra in extras"
        :key="extra"
        class="flex flex-col gap-2 border-t border-ghost-border pt-4"
      >
        <h3 class="flex items-center gap-2.5 text-[0.9375rem] font-semibold">
          {{ t(`home.extras.items.${extra}.title`) }}
          <kbd
            v-if="extra === 'search'"
            class="rounded-[0.3125rem] border border-ghost-border px-1.5 py-px font-sans text-[0.6875rem] font-medium text-on-ghost-muted"
            >Ctrl K</kbd
          >
        </h3>
        <p class="max-w-[30rem] text-[0.9375rem] leading-relaxed text-on-ghost-muted">
          {{ t(`home.extras.items.${extra}.body`) }}
        </p>
      </li>
    </ul>
  </PageChapter>
</template>
