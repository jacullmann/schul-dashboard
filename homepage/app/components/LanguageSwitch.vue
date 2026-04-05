<script setup lang="ts">
const { locales, locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();

function setLocale(newLocale: string) {
  navigateTo(switchLocalePath(newLocale));
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <h3 class="text-btn font-semibold text-on-surface m-0 font-sans">{{ $t('common.language') }}</h3>
    <div class="flex gap-2" role="group" aria-label="Language selection">
      <button
        v-for="loc in locales"
        :key="loc.code"
        type="button"
        :aria-current="locale === loc.code"
        class="px-3 py-2 rounded-lg border text-footnote font-medium transition-colors"
        :class="locale === loc.code
          ? 'bg-surface-hover border-surface-hover-border text-on-surface'
          : 'bg-surface border-surface-border text-on-surface-muted hover:text-on-surface'
        "
        @click="setLocale(loc.code)"
      >
        {{ loc.name }}
      </button>
    </div>
  </div>
</template>
