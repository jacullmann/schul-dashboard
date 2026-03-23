<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  GripVertical, Trash2,
  ChevronDown, ChevronRight,
  Bold, Palette
} from 'lucide-vue-next';

const props = defineProps<{
  block: {
    id: string;
    type: string;
    content: string;
    checked?: boolean;
    isCollapsed?: boolean;
    indentLevel: number;
  };
}>();

const emit = defineEmits<{
  (e: 'update:content', value: string): void;
  (e: 'update:checked', value: boolean): void;
  (e: 'toggle-collapse'): void;
  (e: 'keydown-enter', event: KeyboardEvent): void;
  (e: 'keydown-backspace', event: KeyboardEvent): void;
  (e: 'indent'): void;
  (e: 'outdent'): void;
  (e: 'delete'): void;
  (e: 'focus'): void;
  (e: 'change-type', value: string): void;
}>();

const inputEl = ref<HTMLElement | null>(null);

// FIX: State for color picker toggle
const showColors = ref(false);

const COLORS = [
  '#000000', '#ffffff',
  '#d32f2f', '#f57c00',
  '#388e3c', '#1976d2',
  '#7b1fa2', '#795548',
];

const PLACEHOLDERS: Record<string, string> = {
  h1: 'Überschrift 1',
  h2: 'Überschrift 2',
  h3: 'Überschrift 3',
  h4: 'Überschrift 4',
  p:  'Schreibe etwas…',
  ul: 'Listenpunkt',
  cl: 'Aufgabe',
};

const isFocused = ref(false);

const isHeading = computed(() =>
    ['h1', 'h2', 'h3', 'h4'].includes(props.block.type)
);

function onInput(e: Event) {
  const target = e.target as HTMLElement;
  emit('update:content', target.innerHTML);
}
function onFocus() {
  isFocused.value = true;
  emit('focus');
}
function onBlur() {
  setTimeout(() => {
    isFocused.value = false;
    showColors.value = false; // FIX: Reset picker state on blur
  }, 200);
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // FIX: Prevent default to stop ghost new lines
    emit('keydown-enter', e);
  } else if (e.key === 'Backspace') {
    emit('keydown-backspace', e);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) emit('outdent');
    else            emit('indent');
  }
}
function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
  const el = document.getElementById(`block-input-${props.block.id}`);
  if (el) emit('update:content', el.innerHTML);
}
function applyColor(color: string) {
  exec('foreColor', color);
  // Optional: close picker after selection
  showColors.value = false;
}
onMounted(() => {
  if (inputEl.value) {
    inputEl.value.innerHTML = props.block.content;
  }
});
watch(() => props.block.content, (newContent) => {
  if (!inputEl.value) return;
  if (isFocused.value) return;
  if (inputEl.value.innerHTML !== newContent) {
    inputEl.value.innerHTML = newContent;
  }
});
</script>

<template>
  <div
      :id="`block-wrapper-${block.id}`"
      class="block-wrapper"
      :class="{ 'is-checked': block.checked && block.type === 'cl' }"
      :style="{ paddingLeft: `${block.indentLevel * 24}px` }"
  >
    <div class="block-controls">
      <div class="drag-handle" title="Verschieben">
        <GripVertical :size="14" />
      </div>
      <button class="delete-btn" @click="$emit('delete')" title="Löschen">
        <Trash2 :size="14" />
      </button>
    </div>

    <div
        v-if="isHeading"
        class="collapse-toggle"
        @click="$emit('toggle-collapse')"
        :title="block.isCollapsed ? 'Aufklappen' : 'Einklappen'"
    >
      <ChevronRight v-if="block.isCollapsed" :size="15" />
      <ChevronDown  v-else                   :size="15" />
    </div>

    <div v-if="block.type === 'ul'" class="marker-bullet">•</div>

    <div v-if="block.type === 'cl'" class="marker-checkbox">
      <input
          type="checkbox"
          :checked="block.checked"
          @change="$emit('update:checked', ($event.target as HTMLInputElement).checked)"
      />
    </div>

    <div class="content-area">

      <div v-if="isFocused" class="floating-toolbar" @mousedown.prevent>
        <button @click="exec('bold')" title="Fett">
          <Bold :size="12" />
        </button>
        <div class="tb-divider"></div>

        <div class="color-picker-wrapper">
          <button class="color-btn" title="Textfarbe" @click="showColors = !showColors">
            <Palette :size="12" />
          </button>

          <div v-if="showColors" class="color-dropdown">
            <div
                v-for="c in COLORS"
                :key="c"
                class="color-swatch"
                :style="{ backgroundColor: c }"
                :title="c"
                @click="applyColor(c)"
            ></div>
            <label class="color-swatch custom-color" title="Eigene Farbe">
              +
              <input type="color" @input="(e: any) => applyColor(e.target.value)" />
            </label>
          </div>
        </div>

        <div class="tb-divider"></div>

        <select
            :value="block.type"
            @change="$emit('change-type', ($event.target as HTMLSelectElement).value)"
            title="Block-Typ"
        >
          <option value="p">Text</option>
          <option value="h1">Überschrift 1</option>
          <option value="h2">Überschrift 2</option>
          <option value="h3">Überschrift 3</option>
          <option value="ul">Liste</option>
          <option value="cl">Checkliste</option>
        </select>
      </div>

      <div
          ref="inputEl"
          :id="`block-input-${block.id}`"
          contenteditable="true"
          class="editable-input"
          :class="block.type"
          :placeholder="PLACEHOLDERS[block.type] ?? 'Schreibe etwas…'"
          @input="onInput"
          @keydown="onKeydown"
          @focus="onFocus"
          @blur="onBlur"
      ></div>

    </div>
  </div>
</template>

<style scoped>
/* =========================================
   Block Container & Layout
   ========================================= */
.block-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 3px 0 3px 8px;
  border-radius: 4px;
  transition: background 0.1s;
  margin-bottom: 1px;
}

.block-wrapper:hover {
  background: var(--color-surface, #f5f5f5);
}

/* =========================================
   Block Controls (Drag/Delete)
   ========================================= */
.block-controls {
  position: absolute;
  left: -44px;
  top: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
  z-index: 100;
}

.block-wrapper:hover .block-controls {
  opacity: 1;
  pointer-events: all;
}

.drag-handle,
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  border: none;
  background: none;
  color: var(--color-on-surface-muted, #888);
  cursor: pointer;
}

.drag-handle:hover {
  background: var(--color-surface-hover, #eee);
  color: var(--color-on-surface, #333);
  cursor: grab;
}

.delete-btn:hover {
  background: rgba(246, 82, 82, 0.1);
  color: #f65252;
}

.collapse-toggle {
  position: absolute;
  left: -20px;
  top: 6px;
  cursor: pointer;
  color: var(--color-on-surface-muted, #aaa);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  padding: 1px;
  transition: color 0.15s;
}

.collapse-toggle:hover {
  color: var(--color-on-surface, #333);
}

/* =========================================
   Markers & Content
   ========================================= */
.marker-bullet {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  font-size: 18px;
  line-height: 1.4;
  color: var(--color-on-surface-muted, #888);
  margin-right: 6px;
  user-select: none;
  margin-top: 2px;
}

.marker-checkbox {
  width: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  margin-top: 5px;
}

.marker-checkbox input[type="checkbox"] {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--color-on-surface, #333);
}

.content-area {
  flex: 1;
  position: relative;
  min-width: 0;
}

.editable-input {
  outline: none;
  min-height: 24px;
  word-break: break-word;
  line-height: 1.6;
}

.editable-input:empty::before {
  content: attr(placeholder);
  color: var(--color-on-surface-muted, #bbb);
  pointer-events: none;
}

.is-checked .editable-input {
  text-decoration: line-through;
  color: var(--color-on-surface-muted, #999);
}

/* =========================================
   Typography
   ========================================= */
.h1 {
  font-size: 1.9em;
  font-weight: 700;
  color: var(--color-on-surface, #111);
  line-height: 1.2;
  margin: 12px 0 4px;
}

.h2 {
  font-size: 1.5em;
  font-weight: 700;
  color: var(--color-on-surface, #111);
  margin: 10px 0 4px;
}

.h3 {
  font-size: 1.2em;
  font-weight: 600;
  color: var(--color-on-surface, #111);
  margin: 8px 0 2px;
}

.h4 {
  font-size: 1.05em;
  font-weight: 600;
  color: var(--color-on-surface, #111);
  margin: 6px 0 2px;
}

.p {
  font-size: 1em;
  color: var(--color-on-surface, #333);
  margin: 2px 0;
}

.ul, .cl {
  font-size: 1em;
  color: var(--color-on-surface, #333);
  margin: 1px 0;
}

/* =========================================
   Floating Toolbar
   ========================================= */
.floating-toolbar {
  position: absolute;
  top: -38px;
  left: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  background: #1e1e1e;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.floating-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #ddd;
  padding: 4px 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s;
}

.floating-toolbar button:hover {
  background: #3a3a3a;
  color: #fff;
}

.tb-divider {
  width: 1px;
  height: 16px;
  background: #444;
  margin: 0 3px;
  flex-shrink: 0;
}

.floating-toolbar select {
  background: #2a2a2a;
  color: #ddd;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  padding: 3px 4px;
  cursor: pointer;
  outline: none;
}

.floating-toolbar select:hover {
  background: #3a3a3a;
}

/* =========================================
   Color Picker Dropdown
   ========================================= */
.color-picker-wrapper {
  position: relative;
}

.color-dropdown {
  display: flex;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px;
  gap: 4px;
  flex-wrap: wrap;
  width: 116px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 300;
}

/* Invisible bridge to prevent dropdown closing when moving mouse */
.color-dropdown::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  height: 8px;
  background: transparent;
}

.color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.1s;
  flex-shrink: 0;
}

.color-swatch:hover {
  transform: scale(1.2);
}

.custom-color {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f00, #0f0, #00f);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  position: relative;
  overflow: hidden;
}

.custom-color input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
</style>