<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';

defineEmits<{
  click: [];
}>();
</script>

<template>
  <BaseButton
    variant="ghost"
    :icon="ArrowLeft"
    class="-ml-3 mb-2"
    @click="$emit('click')"
  >
    <slot />
  </BaseButton>
</template>
