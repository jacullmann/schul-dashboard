<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="w-full px-4 py-16 md:py-12 pb-24">
    <div class="max-w-[720px] mx-auto">
      <NuxtLink
        :to="useLocalePath()('index')"
        class="inline-flex items-center gap-1.5 text-sub text-on-surface-muted no-underline hover:text-on-surface transition-colors mb-10"
      >
        <span aria-hidden="true">←</span>
        {{ $t('common.back_home') }}
      </NuxtLink>

      <h1 class="text-h1 font-bold font-display text-on-surface mb-3">{{ title }}</h1>
      <p v-if="description" class="text-on-surface-muted leading-[1.65] mb-12">{{ description }}</p>

      <div class="flex flex-col divide-y divide-surface-border">
        <slot />
      </div>
    </div>
  </div>
</template>
