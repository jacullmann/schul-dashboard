<script setup lang="ts">
withDefaults(
  defineProps<{
    error?: string;
  }>(),
  {
    error: '',
  },
);

defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col gap-4">
      <slot></slot>
    </div>

    <!-- Spacing lives inside the collapsing row, not a flex gap, so it
         animates with the error instead of jumping. -->
    <Transition name="form-error" appear>
      <div v-if="error" class="form-error">
        <div>
          <div
            class="form-error-message pt-4 text-danger text-sm/[1.4] font-sans"
            role="alert"
            aria-live="polite"
          >
            <Transition name="form-error-swap">
              <span :key="error">{{ error }}</span>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
