<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    length?: number;
    invalid?: boolean;
  }>(),
  {
    length: 6,
    invalid: false,
  },
);

const emit = defineEmits<{
  complete: [code: string];
}>();

defineOptions({
  inheritAttrs: false,
});

const model = defineModel<string>({ default: '' });
const inputRef = ref<HTMLInputElement | null>(null);
const focused = ref(false);

const slots = computed(() =>
  Array.from({ length: props.length }, (_, index) => model.value[index] ?? ''),
);

const activeIndex = computed(() =>
  Math.min(model.value.length, props.length - 1),
);

function sanitize(raw: string) {
  return raw.replace(/\D/g, '').slice(0, props.length);
}

function onInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const code = sanitize(input.value);
  // Rejected characters leave the model unchanged, so Vue would not patch
  // them back out of the DOM on its own.
  input.value = code;
  model.value = code;
  if (code.length === props.length) emit('complete', code);
}

// The slots only render the code left to right, so the caret stays at its
// end where the active slot shows it.
function pinCaretToEnd() {
  const end = model.value.length;
  inputRef.value?.setSelectionRange(end, end);
}

function onKeydown(event: KeyboardEvent) {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
  }
}

function onFocus() {
  focused.value = true;
  pinCaretToEnd();
}

function lineClass(index: number) {
  if (props.invalid) return 'bg-danger';
  if (focused.value && index === activeIndex.value) return 'bg-on-ghost';
  return slots.value[index] ? 'bg-on-ghost-muted' : 'bg-ghost-border';
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<template>
  <div
    class="relative mx-auto flex w-full max-w-xs gap-3 has-disabled:opacity-50"
  >
    <div
      v-for="(character, index) in slots"
      :key="index"
      class="flex flex-1 flex-col items-center gap-1"
      aria-hidden="true"
    >
      <span class="h-10 font-mono text-3xl/10 text-on-ghost">
        {{ character }}
      </span>
      <span
        class="h-0.5 w-full rounded-full transition-focus"
        :class="lineClass(index)"
      ></span>
    </div>

    <input
      :id="props.id"
      ref="inputRef"
      :value="model"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      :maxlength="props.length"
      autocomplete="one-time-code"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      :aria-invalid="props.invalid || undefined"
      class="absolute inset-0 size-full cursor-text border-none bg-transparent p-0 text-base text-transparent caret-transparent outline-none selection:bg-transparent! selection:text-transparent! disabled:cursor-not-allowed"
      v-bind="$attrs"
      @input="onInput"
      @keydown="onKeydown"
      @click="pinCaretToEnd"
      @focus="onFocus"
      @blur="focused = false"
    />
  </div>
</template>
