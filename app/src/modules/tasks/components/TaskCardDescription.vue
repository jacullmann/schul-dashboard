<script setup lang="ts">
/* eslint-disable vue/one-component-per-file */
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  nextTick,
  h,
  defineComponent,
  type VNode,
} from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import BaseLink from '@/common/components/BaseLink.vue';

const props = defineProps<{
  description: string;
  isExpanded: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

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

const tokens = computed(() => {
  if (!props.description) return [];
  return marked.lexer(props.description);
});

// Recursive token mapping to VNodes
function renderToken(token: any): VNode | string {
  switch (token.type) {
    case 'heading':
      return h('p', {}, token.raw.replace(/\n+$/, ''));
    case 'paragraph':
      return h('p', {}, renderTokens(token.tokens));
    case 'text':
      return token.tokens
        ? h('span', {}, renderTokens(token.tokens))
        : token.text;
    case 'strong':
      return h('strong', {}, renderTokens(token.tokens));
    case 'em':
      return h('em', {}, renderTokens(token.tokens));
    case 'codespan':
      return token.raw;
    case 'code':
      return h('p', {}, token.raw.replace(/\n+$/, ''));
    case 'blockquote':
      return h('p', {}, token.raw.replace(/\n+$/, ''));
    case 'list':
      return h(token.ordered ? 'ol' : 'ul', {}, [
        ...token.items.map((item: any) =>
          h('li', {}, renderTokens(item.tokens)),
        ),
      ]);
    case 'list_item':
      return h('li', {}, renderTokens(token.tokens));
    case 'link':
      return h(BaseLink, { to: token.href }, () => renderTokens(token.tokens));
    case 'br':
      return h('br');
    case 'space':
      return '';
    case 'escape':
      return token.text;
    case 'html':
      return h('span', { innerHTML: DOMPurify.sanitize(token.text) });
    case 'table': {
      const headerRow = h(
        'tr',
        {},
        token.header.map((cell: any, index: number) => {
          const align = token.align[index];
          return h(
            'th',
            { style: align ? { textAlign: align } : undefined },
            renderTokens(cell.tokens),
          );
        }),
      );
      const bodyRows = token.rows.map((row: any[]) => {
        return h(
          'tr',
          {},
          row.map((cell: any, index: number) => {
            const align = token.align[index];
            return h(
              'td',
              { style: align ? { textAlign: align } : undefined },
              renderTokens(cell.tokens),
            );
          }),
        );
      });
      return h(TableWrapper, {}, () =>
        h('table', {}, [h('thead', {}, [headerRow]), h('tbody', {}, bodyRows)]),
      );
    }

    default:
      return token.text || '';
  }
}

function renderTokens(tokensList: any[] | undefined): (VNode | string)[] {
  if (!tokensList) return [];
  return tokensList.map(renderToken);
}

const TableWrapper = defineComponent({
  name: 'TableWrapper',
  setup(props, { slots }) {
    const wrapperRef = ref<HTMLElement | null>(null);
    const showLeftFade = ref(false);
    const showRightFade = ref(false);

    const updateFade = () => {
      const el = wrapperRef.value;
      if (!el) return;
      showLeftFade.value = el.scrollLeft > 1;
      showRightFade.value = el.scrollWidth - el.scrollLeft - el.clientWidth > 1;
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateFade();
          ticking = false;
        });
        ticking = true;
      }
    };

    const maskStyle = computed(() => {
      const left = showLeftFade.value;
      const right = showRightFade.value;

      let mask = 'none';
      if (left && right) {
        mask =
          'linear-gradient(to right, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
      } else if (left) {
        mask = 'linear-gradient(to right, transparent 0px, black 32px)';
      } else if (right) {
        mask = 'linear-gradient(to left, transparent 0px, black 32px)';
      }
      return {
        webkitMaskImage: mask,
        maskImage: mask,
      };
    });

    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      updateFade();
      window.addEventListener('resize', updateFade);

      const el = wrapperRef.value;
      if (el) {
        resizeObserver = new ResizeObserver(() => {
          updateFade();
        });
        resizeObserver.observe(el);
        for (const child of el.children) {
          resizeObserver.observe(child);
        }
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', updateFade);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });

    return () =>
      h(
        'div',
        {
          ref: wrapperRef,
          class:
            'overflow-x-auto my-3! transition-all duration-300 scrollbar-hide',
          style: maskStyle.value,
          onScroll: handleScroll,
        },
        slots.default?.(),
      );
  },
});

const MarkdownRenderer = defineComponent({
  name: 'MarkdownRenderer',
  props: {
    tokens: {
      type: Array,
      required: true,
    },
    isExpanded: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    return () => renderTokens(props.tokens as any[]);
  },
});

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
  window.addEventListener('resize', checkOverflow);

  if (contentRef.value) {
    contentResizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    contentResizeObserver.observe(contentRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkOverflow);
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
      <div
        ref="contentRef"
        class="description-content min-h-0 overflow-hidden whitespace-normal prose-custom [&_p]:mt-0! [&_p]:mb-2! [&_p]:text-on-ghost! [&_p]:whitespace-pre-wrap! [&_p:last-child]:mb-0! [&_ul]:mt-0! [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2! [&_ol]:mt-0! [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2! [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-on-ghost [&_a]:text-primary [&_a]:underline [&_code]:bg-surface-elevated [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:mt-0! [&_pre]:bg-surface-elevated [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_h1]:mt-0! [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:mt-0! [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:mt-0! [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-ghost-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_>_*:first-child]:mt-0! [&_>_*:last-child]:mb-0! inline-block w-full align-top"
      >
        <MarkdownRenderer :tokens="tokens" :is-expanded="isExpanded" />
      </div>
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
    {{ isExpanded ? 'Weniger anzeigen' : 'mehr' }}
  </button>
</template>
