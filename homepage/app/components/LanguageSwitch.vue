<script setup lang="ts">
const { locales, locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();

function setLocale(code: string) {
  navigateTo(switchLocalePath(code));
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm font-semibold text-on-ghost m-0">{{ $t('common.language') }}</p>
    <BaseRow role="group" :aria-label="$t('common.language')">
      <BaseButton
        v-for="loc in locales"
        :key="loc.code"
        variant="ghost"
        :aria-current="locale === loc.code ? 'true' : undefined"
        :class="locale === loc.code ? 'bg-surface-hover! text-on-ghost!' : ''"
        @click="setLocale(loc.code)"
      >
        {{ loc.name }}
      </BaseButton>
    </BaseRow>
  </div>
</template>
