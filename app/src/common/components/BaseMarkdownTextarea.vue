<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { marked } from 'marked';

const props = withDefaults(
  defineProps<{
    id: string;
    required?: boolean;
    rows?: string | number;
  }>(),
  {
    required: false,
    rows: '4',
  },
);

defineOptions({
  inheritAttrs: false,
});

const model = defineModel<string>();
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const backdropRef = ref<HTMLDivElement | null>(null);

interface MarkdownToken {
  text: string;
  type: string;
}

// Reconstruct syntax markers and content using marked's lexer tokens character-for-character
function processTokens(
  tokensList: any[],
  parentType: string = 'text',
): MarkdownToken[] {
  const result: MarkdownToken[] = [];
  if (!tokensList) return [];

  for (const token of tokensList) {
    switch (token.type) {
      case 'strong': {
        const nextType =
          parentType === 'italic' || parentType === 'bold-italic'
            ? 'bold-italic'
            : 'bold';
        if (token.tokens && token.tokens.length > 0) {
          const childrenRaw = token.tokens.map((t: any) => t.raw).join('');
          const raw = token.raw;
          const index = raw.indexOf(childrenRaw);
          if (index !== -1) {
            const prefix = raw.slice(0, index);
            const suffix = raw.slice(index + childrenRaw.length);
            if (prefix) result.push({ text: prefix, type: 'marker' });
            result.push(...processTokens(token.tokens, nextType));
            if (suffix) result.push({ text: suffix, type: 'marker' });
          } else {
            result.push(...processTokens(token.tokens, nextType));
          }
        } else {
          const raw = token.raw;
          const text = token.text;
          const index = raw.indexOf(text);
          if (index !== -1) {
            const prefix = raw.slice(0, index);
            const suffix = raw.slice(index + text.length);
            if (prefix) result.push({ text: prefix, type: 'marker' });
            result.push({ text, type: nextType });
            if (suffix) result.push({ text: suffix, type: 'marker' });
          } else {
            result.push({ text: raw, type: nextType });
          }
        }
        break;
      }
      case 'em': {
        const nextType =
          parentType === 'bold' || parentType === 'bold-italic'
            ? 'bold-italic'
            : 'italic';
        if (token.tokens && token.tokens.length > 0) {
          const childrenRaw = token.tokens.map((t: any) => t.raw).join('');
          const raw = token.raw;
          const index = raw.indexOf(childrenRaw);
          if (index !== -1) {
            const prefix = raw.slice(0, index);
            const suffix = raw.slice(index + childrenRaw.length);
            if (prefix) result.push({ text: prefix, type: 'marker' });
            result.push(...processTokens(token.tokens, nextType));
            if (suffix) result.push({ text: suffix, type: 'marker' });
          } else {
            result.push(...processTokens(token.tokens, nextType));
          }
        } else {
          const raw = token.raw;
          const text = token.text;
          const index = raw.indexOf(text);
          if (index !== -1) {
            const prefix = raw.slice(0, index);
            const suffix = raw.slice(index + text.length);
            if (prefix) result.push({ text: prefix, type: 'marker' });
            result.push({ text, type: nextType });
            if (suffix) result.push({ text: suffix, type: 'marker' });
          } else {
            result.push({ text: raw, type: nextType });
          }
        }
        break;
      }
      case 'link': {
        const raw = token.raw;
        const linkTextRaw = token.tokens
          ? token.tokens.map((t: any) => t.raw).join('')
          : token.text;
        const textIndex = raw.indexOf(linkTextRaw);
        if (textIndex !== -1) {
          const prefix = raw.slice(0, textIndex);
          if (prefix) result.push({ text: prefix, type: 'marker' });

          if (token.tokens) {
            result.push(...processTokens(token.tokens, 'link-text'));
          } else {
            result.push({ text: token.text, type: 'link-text' });
          }

          const suffix = raw.slice(textIndex + linkTextRaw.length);
          if (suffix.startsWith('](') && suffix.endsWith(')')) {
            result.push({ text: '](', type: 'marker' });
            const url = suffix.slice(2, -1);
            result.push({ text: url, type: 'link-url' });
            result.push({ text: ')', type: 'marker' });
          } else {
            if (suffix) result.push({ text: suffix, type: 'marker' });
          }
        } else {
          result.push({ text: raw, type: 'link-text' });
        }
        break;
      }
      default: {
        if (token.tokens) {
          result.push(...processTokens(token.tokens, parentType));
        } else {
          result.push({
            text: token.raw || token.text || '',
            type: parentType,
          });
        }
        break;
      }
    }
  }
  return result;
}

function parseText(text: string, parentType: string = 'text'): MarkdownToken[] {
  if (!text) return [];
  const blocks = marked.lexer(text);
  const inlineTokens: any[] = [];
  for (const block of blocks) {
    if (block.tokens) {
      inlineTokens.push(...block.tokens);
    } else if (block.type === 'space') {
      inlineTokens.push({ type: 'text', raw: block.raw, text: block.raw });
    } else {
      inlineTokens.push(block);
    }
  }
  return processTokens(inlineTokens, parentType);
}

function parseLine(line: string): { text: string; type: string }[] {
  // Check if line is a list item: e.g. - item or * item
  const bulletMatch = line.match(/^(\s*)([-*])(\s+)(.*)$/);
  if (bulletMatch) {
    const leadingSpaces = bulletMatch[1];
    const markerChar = bulletMatch[2];
    const trailingSpaces = bulletMatch[3];
    const content = bulletMatch[4];

    const result: { text: string; type: string }[] = [];
    if (leadingSpaces) {
      result.push({ text: leadingSpaces, type: 'text' });
    }
    result.push({ text: markerChar, type: 'list-bullet-char' });
    result.push({ text: trailingSpaces, type: 'text' });
    result.push(...parseText(content, 'text'));
    return result;
  }

  // Numbered list item: e.g. 1. item
  const numberMatch = line.match(/^(\s*)(\d+\.)(\s+)(.*)$/);
  if (numberMatch) {
    const leadingSpaces = numberMatch[1];
    const numberMarker = numberMatch[2];
    const trailingSpaces = numberMatch[3];
    const content = numberMatch[4];

    const result: { text: string; type: string }[] = [];
    if (leadingSpaces) {
      result.push({ text: leadingSpaces, type: 'text' });
    }
    result.push({ text: numberMarker, type: 'list-number-char' });
    result.push({ text: trailingSpaces, type: 'text' });
    result.push(...parseText(content, 'text'));
    return result;
  }

  return parseText(line);
}

const tokens = computed(() => {
  const text = model.value || '';
  const lines = text.split('\n');
  const result: { text: string; type: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const suffix = i < lines.length - 1 ? '\n' : '';
    const lineTokens = parseLine(line);

    if (lineTokens.length > 0) {
      lineTokens[lineTokens.length - 1].text += suffix;
      result.push(...lineTokens);
    } else {
      result.push({ text: suffix, type: 'text' });
    }
  }

  // To prevent trailing newline height collapsing in the div backdrop
  if (text.endsWith('\n')) {
    result.push({ text: '\u200B', type: 'text' });
  }

  return result;
});

const tokenClass = (type: string) => {
  switch (type) {
    case 'marker':
      return 'text-on-ghost-subtle font-normal';
    case 'bold':
      return 'backdrop-bold text-on-ghost';
    case 'italic':
      return 'backdrop-italic text-on-ghost';
    case 'bold-italic':
      return 'backdrop-bold backdrop-italic text-on-ghost';
    case 'list-bullet-char':
      return 'list-bullet-char';
    case 'list-number-char':
      return 'list-number-char';
    case 'link-text':
      return 'text-primary underline';
    case 'link-url':
      return 'text-on-ghost-subtle';
    default:
      return 'text-on-ghost';
  }
};

// Scroll synchronization
const handleScroll = (e: Event) => {
  const textarea = e.target as HTMLTextAreaElement;
  if (backdropRef.value) {
    backdropRef.value.scrollTop = textarea.scrollTop;
    backdropRef.value.scrollLeft = textarea.scrollLeft;
  }
};

// Keyboard shortcuts for Ctrl+B / Ctrl+I (Cmd+B / Cmd+I)
const handleKeyDown = (e: KeyboardEvent) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'i')
  ) {
    e.preventDefault();
    const textarea = textareaRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = model.value || '';
    const selectedText = text.substring(start, end);

    const isBold = e.key.toLowerCase() === 'b';
    const marker = isBold ? '**' : '*';

    let newText = '';
    let newCursorStart = start;
    let newCursorEnd = end;

    // Check if selection is already wrapped in markers
    const hasMarkers =
      text.substring(start - marker.length, start) === marker &&
      text.substring(end, end + marker.length) === marker;

    if (hasMarkers) {
      newText =
        text.slice(0, start - marker.length) +
        selectedText +
        text.slice(end + marker.length);
      newCursorStart = start - marker.length;
      newCursorEnd = end - marker.length;
    } else {
      newText =
        text.slice(0, start) + marker + selectedText + marker + text.slice(end);
      newCursorStart = start + marker.length;
      newCursorEnd = end + marker.length;
    }

    model.value = newText;

    void nextTick(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
      // Sync scroll after text update
      if (backdropRef.value) {
        backdropRef.value.scrollTop = textarea.scrollTop;
        backdropRef.value.scrollLeft = textarea.scrollLeft;
      }
    });
  }
};

defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  select: () => textareaRef.value?.select(),
});
</script>

<template>
  <div
    class="relative w-full rounded-lg bg-surface border border-ghost-border shadow-input transition-focus focus-within:border-focus focus-within:shadow-focus-ring"
  >
    <!-- Backdrop rendering the formatted markdown text (placed behind the transparent textarea) -->
    <div
      ref="backdropRef"
      class="backdrop-div absolute inset-0 pointer-events-none overflow-y-auto whitespace-pre-wrap break-words select-none scrollbar-hide"
    >
      <span
        v-for="(token, index) in tokens"
        :key="index"
        :class="tokenClass(token.type)"
        :data-marker="
          token.type === 'list-number-char' ? token.text : undefined
        "
        >{{ token.text }}</span
      >
    </div>

    <!-- Textarea input overlay (placed in front of the backdrop) -->
    <textarea
      :id="props.id"
      ref="textareaRef"
      v-model="model"
      class="custom-textarea resize-vertical block! w-full bg-transparent outline-none shadow-none"
      :rows="props.rows"
      :aria-required="props.required"
      v-bind="$attrs"
      @scroll="handleScroll"
      @keydown="handleKeyDown"
    ></textarea>
  </div>
</template>

<style scoped>
/* Strict structural resets to guarantee 100% identical dimensions, spacing and text rendering */
.custom-textarea,
.backdrop-div {
  margin: 0 !important;
  border: 0 !important;
  padding: 8px 12px !important; /* py-2 px-3 matches BaseInput.vue spacing exactly */
  font-family: var(--font-sans), sans-serif !important;
  font-size: 1rem !important;
  line-height: 1.25rem !important;
  letter-spacing: normal !important;
  word-spacing: normal !important;
  text-transform: none !important;
  text-indent: 0px !important;
  box-sizing: border-box !important;
  white-space: pre-wrap !important;
  overflow-wrap: break-word !important;
  word-break: break-word !important;
  font-variant-ligatures: none !important;
  font-feature-settings:
    'liga' 0,
    'clig' 0,
    'dlig' 0,
    'hlig' 0,
    'calt' 0 !important;
  font-kerning: none !important;
}

.backdrop-div {
  position: absolute !important;
  z-index: 1 !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

.custom-textarea {
  position: relative !important;
  z-index: 2 !important;
  color: transparent;
  caret-color: var(--color-on-ghost) !important;
}

.custom-textarea::placeholder {
  color: var(--color-on-ghost-subtle) !important;
  opacity: 1 !important;
}

/* Selected text in the textarea becomes visible with standard theme selection colors, overlaying the backdrop */
.custom-textarea::selection {
  background-color: var(--color-action) !important;
  color: var(--color-on-action) !important;
}

.custom-textarea::-moz-selection {
  background-color: var(--color-action) !important;
  color: var(--color-on-action) !important;
}

/* Visually replace list marker character with a bullet point */
:deep(.list-bullet-char) {
  color: transparent !important;
  position: relative;
}

:deep(.list-bullet-char::before) {
  content: '•';
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  color: var(--color-on-ghost);
  pointer-events: none;
  font-weight: bold;
}

/* Visually replace numbered list marker character with a styled number marker */
:deep(.list-number-char) {
  color: transparent !important;
  position: relative;
}

:deep(.list-number-char::before) {
  content: attr(data-marker);
  position: absolute;
  left: 0;
  right: 0;
  text-align: left;
  color: var(--color-on-ghost);
  pointer-events: none;
}

/* Simulate bold using text-shadow and oblique using synthetic slant so character layout widths remain 100% identical to normal text */
:deep(.backdrop-bold) {
  font-weight: normal !important;
  text-shadow: 0.5px 0 0 currentColor;
}

:deep(.backdrop-italic) {
  font-weight: normal !important;
  font-style: oblique 14deg !important;
}
</style>
