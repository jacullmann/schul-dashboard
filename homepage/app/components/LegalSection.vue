<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section
    class="grid gap-x-gutter gap-y-3 border-b border-ghost-border py-7 leading-relaxed text-on-ghost-muted md:grid-cols-9"
  >
    <h2 class="text-[0.9375rem] font-semibold text-on-ghost md:col-span-3">{{ title }}</h2>
    <div class="max-w-prose md:col-span-6">
      <slot />
    </div>
  </section>
</template>
