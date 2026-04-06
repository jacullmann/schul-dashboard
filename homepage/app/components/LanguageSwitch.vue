<script setup lang="ts">
const { locales, locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();

function setLocale(code: string) {
  navigateTo(switchLocalePath(code));
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-btn font-semibold text-on-surface m-0">{{ $t('common.language') }}</p>
    <div class="flex gap-1.5" role="group" :aria-label="$t('common.language')">
      <button
        v-for="loc in locales"
        :key="loc.code"
        type="button"
        :aria-current="locale === loc.code ? 'true' : undefined"
        class="px-3 py-1.5 rounded-lg border text-footnote font-medium transition-colors"
        :class="
          locale === loc.code
            ? 'bg-surface-hover border-surface-hover-border text-on-surface'
            : 'bg-surface border-surface-border text-on-surface-muted hover:text-on-surface hover:border-surface-hover-border'
        "
        @click="setLocale(loc.code)"
      >
        {{ loc.name }}
      </button>
    </div>
  </div>
</template>
