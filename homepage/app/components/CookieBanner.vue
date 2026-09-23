<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

const dismissed = useCookie<boolean>('cookie_notice_dismissed', { maxAge: 60 * 60 * 24 * 180 });
</script>

<template>
  <Transition leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0">
    <div
      v-if="!dismissed"
      role="region"
      :aria-label="t('cookie.link')"
      class="fixed inset-x-4 bottom-4 z-(--z-notice) flex items-center gap-4 rounded-xl sm:rounded-full bg-action py-1.5 pr-1.5 pl-5 text-[0.8125rem] text-on-action shadow-menu sm:right-auto sm:left-4 sm:max-w-md"
    >
      <p class="flex-1">
        {{ t('cookie.text') }}
        <NuxtLink :to="localePath('legal-privacy-policy')" class="link-underline whitespace-nowrap">
          {{ t('cookie.link') }}
        </NuxtLink>
      </p>
      <button
        type="button"
        class="h-9 shrink-0 cursor-pointer rounded-full bg-canvas px-4 font-medium text-on-ghost transition-opacity hover:opacity-85"
        @click="dismissed = true"
      >
        {{ t('cookie.dismiss') }}
      </button>
    </div>
  </Transition>
</template>
