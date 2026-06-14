<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  primaryAction?: () => void;
  secondaryAction?: () => void;
  icon?: Component;
}>();
</script>

<template>
  <div class="py-12 text-center flex flex-col items-center">
    <component
      :is="icon"
      v-if="icon"
      :size="40"
      class="text-on-ghost-muted mb-4"
    />
    <h3>
      <slot name="title"></slot>
    </h3>
    <p class="mt-1! mb-6! max-w-96">
      <slot name="message"></slot>
    </p>
    <BaseRow justify="center">
      <BaseButton
        v-if="primaryAction"
        variant="action"
        @click="primaryAction()"
      >
        <slot name="primary-action-label"></slot>
      </BaseButton>
      <BaseButton
        v-if="secondaryAction"
        variant="ghost"
        @click="secondaryAction()"
      >
        <slot name="secondary-action-label"></slot>
      </BaseButton>
    </BaseRow>
  </div>
</template>
