<script setup lang="ts">
const { t, locales, locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();
</script>

<template>
  <nav class="flex items-center gap-4" :aria-label="t('common.language')">
    <NuxtLink
      v-for="option in locales"
      :key="option.code"
      :to="switchLocalePath(option.code)"
      :lang="option.language"
      :aria-current="locale === option.code ? 'true' : undefined"
      class="text-[0.8125rem] transition-colors"
      :class="
        locale === option.code
          ? 'font-medium text-on-ghost'
          : 'text-on-ghost-subtle hover:text-on-ghost'
      "
    >
      {{ option.name }}
    </NuxtLink>
  </nav>
</template>
