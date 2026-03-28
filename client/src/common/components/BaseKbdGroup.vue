<script setup lang="ts">
import { usePlatform } from '@/common/composables/usePlatform';

const props = withDefaults(
  defineProps<{
    keys: string[];
    separator?: string;
  }>(),
  {
    separator: '+',
  }
);

const { isMac, shortcutSymbol, optionSymbol, shiftSymbol } = usePlatform();

const getDisplayKey = (key: string): string => {
  const k = key.toLowerCase();
  
  const mapping: Record<string, string> = {
    // Modifiers
    'control': isMac ? '⌃' : 'Ctrl',
    'ctrl': isMac ? '⌃' : 'Ctrl',
    'meta': isMac ? '⌘' : 'Win',
    'cmd': '⌘',
    'command': '⌘',
    'alt': isMac ? '⌥' : 'Alt',
    'option': '⌥',
    'shift': isMac ? '⇧' : 'Shift',
    
    // Special Keys
    'enter': '↵',
    'return': '↵',
    'backspace': '⌫',
    'escape': 'Esc',
    'esc': 'Esc',
    'tab': '⇥',
  };

  const displayValue = mapping[k] || key;
  return displayValue.length === 1 ? displayValue.toUpperCase() : displayValue;
};
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <template v-for="(key, index) in keys" :key="index">
      <BaseKbd>{{ getDisplayKey(key) }}</BaseKbd>
      <span
        v-if="index < keys.length - 1"
        class="text-on-surface-muted text-sub select-none font-sans"
      >
        {{ separator }}
      </span>
    </template>
  </span>
</template>
