<script setup lang="ts">
interface Props {
  title?: string;
  /* Custom classes for the content container (useful for overriding default gap) */
  contentClass?: string;
}

withDefaults(defineProps<Props>(), {
  contentClass: 'gap-3',
});
</script>

<template>
  <section class="flex flex-col gap-3">
    <h3
      v-if="title"
      class="text-on-surface font-title font-bold m-0 mb-2 lg:mt-8"
    >
      {{ title }}
    </h3>
    <div :class="['flex flex-col', contentClass]">
      <slot />
    </div>
  </section>
</template>
