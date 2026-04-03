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
    'control': shortcutSymbol,
    'ctrl': shortcutSymbol,
    'meta': isMac ? '⌘' : 'Win',
    'cmd': '⌘',
    'command': '⌘',
    'alt': optionSymbol,
    'option': optionSymbol,
    'shift': shiftSymbol,
    
    // Special Keys
    'enter': '↵',
    'return': '↵',
    'backspace': '⌫',
    'escape': 'Esc',
    'esc': 'Esc',
    'tab': '⇥',
  };

  const val = mapping[k] || key;
  return val.length === 1 ? val.toUpperCase() : val;
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
