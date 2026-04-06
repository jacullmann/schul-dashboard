<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  primaryAction?: () => void;
  secondaryAction?: () => void;
  icon?: Component;
}>();
</script>

<template>
  <div class="px-6 py-12 text-center flex flex-col items-center">
    <component
      :is="icon"
      v-if="icon"
      :size="40"
      class="text-on-surface-muted mb-4"
    />
    <h3>
      <slot name="title"></slot>
    </h3>
    <p class="max-w-96">
      <slot name="message"></slot>
    </p>
    <BaseRow justify="center">
      <BaseButton
        v-if="primaryAction"
        @click="primaryAction()"
        variant="action"
      >
        <slot name="primary-action-label"></slot>
      </BaseButton>
      <BaseButton
        v-if="secondaryAction"
        @click="secondaryAction()"
        variant="ghost"
        on="canvas"
      >
        <slot name="secondary-action-label"></slot>
      </BaseButton>
    </BaseRow>
  </div>
</template>
