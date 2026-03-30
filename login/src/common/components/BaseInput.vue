<script setup lang="ts">
import { ref, computed } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';

const props = withDefaults(defineProps<{
  id: string;
  as?: 'input' | 'textarea';
  required?: boolean;
  type?: string;
}>(), { as: 'input', required: false, type: 'text' });

defineOptions({ inheritAttrs: false });

const model = defineModel<string | number | null>();
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const isPasswordVisible = ref(false);

const inputType = computed(() =>
  props.type === 'password' ? (isPasswordVisible.value ? 'text' : 'password') : props.type,
);

const baseClasses =
  'w-full px-3 py-2 rounded-md bg-surface text-on-surface border border-surface-border text-btn leading-4 outline-none shadow-input transition-focus focus:border-focus focus:shadow-focus-ring placeholder:text-on-surface-subtle';

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => (inputRef.value as HTMLInputElement)?.select(),
});
</script>

<template>
  <textarea
    v-if="props.as === 'textarea'"
    :id="props.id" v-model="model" ref="inputRef"
    :class="baseClasses" :aria-required="props.required" v-bind="$attrs"
  />
  <div v-else class="relative w-full flex items-center">
    <input
      :id="props.id" :type="inputType" v-model="model" ref="inputRef"
      :class="[baseClasses, props.type === 'password' ? 'pr-10' : '']"
      :aria-required="props.required" v-bind="$attrs"
    />
    <button
      v-if="props.type === 'password'"
      type="button"
      @click="isPasswordVisible = !isPasswordVisible"
      class="absolute right-3 bg-transparent border-none cursor-pointer p-0 text-on-surface-muted flex items-center justify-center hover:text-on-surface transition-colors outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-focus"
      :aria-label="isPasswordVisible ? 'Hide password' : 'Show password'"
    >
      <EyeOff v-if="isPasswordVisible" :size="20" />
      <Eye v-else :size="20" />
    </button>
  </div>
</template>
