<script setup lang="ts">
import { ref, computed } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    id: string;
    as?: 'input' | 'textarea';
    required?: boolean;
    type?: string;
  }>(),
  {
    as: 'input',
    required: false,
    type: 'text',
  },
);

defineOptions({
  inheritAttrs: false,
});

const model = defineModel<string | number | null>();
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

const isPasswordVisible = ref(false);

const inputType = computed(() => {
  if (props.type === 'password') {
    return isPasswordVisible.value ? 'text' : 'password';
  }
  return props.type;
});

const togglePassword = () => {
  isPasswordVisible.value = !isPasswordVisible.value;
};

const baseClasses =
  'relative w-full px-3 py-2 min-h-10 touch-target after:min-w-12 after:min-h-12 rounded-lg bg-surface text-on-ghost border border-surface-border text-base/5 outline-none shadow-input transition-focus focus:border-focus focus:shadow-focus-ring placeholder:text-on-ghost-subtle';

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
});
</script>

<template>
  <textarea
    v-if="props.as === 'textarea'"
    :id="props.id"
    ref="inputRef"
    v-model="model"
    class="resize-vertical"
    :class="baseClasses"
    :aria-required="props.required"
    v-bind="$attrs"
  ></textarea>

  <div v-else class="relative w-full flex items-center">
    <input
      :id="props.id"
      ref="inputRef"
      v-model="model"
      :type="inputType"
      :class="[baseClasses, props.type === 'password' ? 'pr-10' : '']"
      :aria-required="props.required"
      v-bind="$attrs"
    />

    <button
      v-if="props.type === 'password'"
      type="button"
      class="absolute right-3 p-0 touch-target after:min-w-12 after:min-h-12 bg-transparent border-none cursor-pointer text-on-ghost-muted flex items-center justify-center hover:text-on-ghost transition-colors outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-focus"
      :aria-label="isPasswordVisible ? 'Hide password' : 'Show password'"
      @click="togglePassword"
    >
      <EyeOff v-if="isPasswordVisible" :size="20" />
      <Eye v-else :size="20" />
    </button>
  </div>
</template>
