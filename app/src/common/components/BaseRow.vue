<script setup lang="ts">
import { computed } from 'vue';

type JustifyOption = 'start' | 'end' | 'center' | 'between' | 'around';

const props = withDefaults(defineProps<{
  justify?: JustifyOption;
}>(), {
  justify: 'start',
});

const justifyClasses: Record<JustifyOption, string> = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
};

const alignmentClass = computed(() => justifyClasses[props.justify]);
</script>

<template>
  <div class="flex flex-wrap gap-2" :class="alignmentClass">
    <slot></slot>
  </div>
</template>