<script setup lang="ts">
const props = defineProps({
  primaryAction: Function,
  secondaryAction: Function,
  icon: Object,
})
</script>

<template>
  <div class="px-6 py-12 text-center flex flex-col items-center">
    <component :is="icon" :size="40" class="text-on-surface-muted mb-4" />
    <BaseHeading level="3">
      <slot name="title"></slot>
    </BaseHeading>
    <p class="max-w-96">
      <slot name="message"></slot>
    </p>
    <div class="flex justify-center gap-2">
      <BaseButton :@click="primaryAction" variant="action">
        <slot name="primary-action-label"></slot>
      </BaseButton>
      <BaseButton :@click="secondaryAction" variant="ghost">
        <slot name="secondary-action-label"></slot>
      </BaseButton>
    </div>
  </div>
</template>