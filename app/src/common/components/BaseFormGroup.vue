<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    error?: string;
  }>(),
  {
    error: '',
  },
);

defineSlots<{
  default(): unknown;
}>();

const errorId = computed(() => `${props.id}-error`);
</script>

<template>
  <div class="flex flex-col w-full">
    <div>
      <slot></slot>
    </div>

    <Transition name="form-error" appear>
      <div v-if="error" class="form-error">
        <div>
          <div
            :id="errorId"
            class="form-error-message pt-1.5 text-danger text-sm/[1.4] font-sans"
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
