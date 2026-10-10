<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue';

defineEmits<{
  click: [];
}>();
</script>

<template>
  <BaseButton
    variant="ghost"
    :icon="ChevronLeft"
    class="-ml-3 mb-2"
    @click="$emit('click')"
  >
    <slot />
  </BaseButton>
</template>
