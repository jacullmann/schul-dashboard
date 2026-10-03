<script setup lang="ts">
import { computed } from 'vue';

type JustifyOption = 'start' | 'end' | 'center' | 'between' | 'around';

const props = withDefaults(
  defineProps<{
    justify?: JustifyOption;
    stackOnMobile?: boolean;
  }>(),
  {
    justify: 'start',
    stackOnMobile: false,
  },
);

const justifyClasses: Record<JustifyOption, string> = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
};

const alignmentClass = computed(() => justifyClasses[props.justify]);

// Reversed so the primary action, placed last for tab order, sits on top.
const layoutClass = computed(() =>
  props.stackOnMobile
    ? 'flex-col-reverse items-stretch md:flex-row md:flex-wrap md:items-center'
    : 'flex-wrap items-center',
);
</script>

<template>
  <div class="flex gap-2" :class="[layoutClass, alignmentClass]">
    <slot></slot>
  </div>
</template>
