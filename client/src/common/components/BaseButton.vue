<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue';

export interface Props {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'action' | 'ghost' | 'danger' | 'default';
  loading?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'default',
  loading: false,
  disabled: false
});
</script>

<template>
  <button 
    class="btn" 
    :class="variant !== 'default' ? variant : ''" 
    :type="type" 
    :disabled="disabled || loading"
  >
    <LoadingSpinner v-if="loading" size="1em" />
    <slot v-else></slot>
  </button>
</template>
