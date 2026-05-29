<script setup lang="ts">
import { ArrowDown } from '@lucide/vue';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <Transition name="scale-fade">
    <BaseButton
      v-if="show"
      variant="action"
      @click="emit('click')"
      class="absolute! bottom-20 right-4 md:bottom-24 md:right-8"
      title="Nach unten"
      :icon="ArrowDown"
    />
  </Transition>
</template>
