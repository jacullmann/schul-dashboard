<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { BULLET_MARKER } from '@/utils/bullets';

const props = defineProps<{
  description: string;
  isExpanded: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

const { t } = useI18n();

const contentRef = ref<HTMLElement | null>(null);

const estimateHasOverflow = (text: string): boolean => {
  if (!text) return false;
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const cardWidth = Math.min(width, 768) - 16;
  const charsPerLine = Math.max(15, Math.floor(cardWidth / 8.5));

  const paragraphs = text.split('\n');
  let totalLines = 0;
  for (const p of paragraphs) {
    totalLines += Math.max(1, Math.ceil(p.length / charsPerLine));
  }

  return totalLines >= 4;
};

const hasOverflow = ref(estimateHasOverflow(props.description));

const displayText = computed(() =>
  props.description.replace(BULLET_MARKER, '•'),
);

const contentHeight = ref(0);

const containerStyle = computed(() => {
  if (!hasOverflow.value && contentHeight.value > 0) return undefined;
  if (props.isExpanded && contentHeight.value === 0) return undefined;
  return {
    maxHeight: props.isExpanded ? `${contentHeight.value}px` : '5rem',
  };
});

const checkOverflow = () => {
  if (contentRef.value) {
    const scrollHeight = contentRef.value.scrollHeight;
    if (scrollHeight === 0) return;
    contentHeight.value = scrollHeight;
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxCollapsedHeight = 5 * rootFontSize;
    hasOverflow.value = contentHeight.value > maxCollapsedHeight + 2;
  }
};

let contentResizeObserver: ResizeObserver | null = null;

onMounted(() => {
  checkOverflow();

  if (contentRef.value) {
    contentResizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    contentResizeObserver.observe(contentRef.value);
  }
});

onUnmounted(() => {
  if (contentResizeObserver) {
    contentResizeObserver.disconnect();
  }
});

watch(
  () => props.description,
  (newVal) => {
    contentHeight.value = 0;
    hasOverflow.value = estimateHasOverflow(newVal);
    void nextTick(() => {
      checkOverflow();
    });
  },
);
</script>

<template>
  <div class="relative w-full">
    <div
      class="overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
      :style="containerStyle"
    >
      <!-- prettier-ignore -->
      <div ref="contentRef" class="whitespace-pre-wrap break-words text-on-ghost">{{ displayText }}</div>
    </div>

    <!-- Fade-out overlay when collapsed and overflowing -->
    <div
      v-if="hasOverflow"
      class="absolute bottom-0 left-0 right-0 h-8 pointer-events-none transition-opacity duration-300"
      :class="isExpanded ? 'opacity-0' : 'opacity-100'"
      style="
        background: linear-gradient(
          to top,
          var(--color-surface) 0%,
          transparent 100%
        );
      "
    ></div>
  </div>

  <button
    v-if="hasOverflow || isExpanded"
    type="button"
    class="relative text-base font-bold text-on-ghost-muted hover:text-on-ghost cursor-pointer touch-target after:min-w-12 after:min-h-12 block"
    :class="isExpanded ? 'mt-2' : 'mt-1'"
    @click="$emit('toggle')"
  >
    {{
      isExpanded
        ? t('common.buttons.show_less')
        : t('tasks.list.description.more')
    }}
  </button>
</template>
