<script setup lang="ts">
import { computed, type Component } from 'vue';

const props = withDefaults(
  defineProps<{
    primaryAction?: () => void;
    secondaryAction?: () => void;
    icon?: Component;
    fullPage?: boolean;
  }>(),
  {
    primaryAction: undefined,
    secondaryAction: undefined,
    icon: undefined,
    fullPage: false,
  },
);

const actionButtonClass = computed(() =>
  props.fullPage ? undefined : 'max-md:flex-1 max-md:min-w-fit',
);
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
    <!-- flex-1 buttons share a line until their labels no longer fit; wrap-reverse
         then stacks the primary action on top, matching the full page layout. -->
    <BaseRow
      v-if="primaryAction || secondaryAction"
      :stack-on-mobile="fullPage"
      justify="center"
      class="w-full"
      :class="
        fullPage ? 'md:flex-row-reverse' : 'flex-row-reverse flex-wrap-reverse!'
      "
    >
      <BaseButton
        v-if="secondaryAction"
        form
        variant="ghost"
        surface
        :class="actionButtonClass"
        @click="secondaryAction()"
      >
        <slot name="secondary-action-label"></slot>
      </BaseButton>
      <BaseButton
        v-if="primaryAction"
        form
        variant="action"
        :class="actionButtonClass"
        @click="primaryAction()"
      >
        <slot name="primary-action-label"></slot>
      </BaseButton>
    </BaseRow>
  </div>
</template>
