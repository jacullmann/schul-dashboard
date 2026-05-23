<script setup lang="ts">
import { usePlatform } from '@/common/composables/usePlatform';

const props = withDefaults(
  defineProps<{
    keys: string[];
    separator?: string;
    on?: 'canvas' | 'surface' | 'action';
    flat?: boolean;
  }>(),
  {
    separator: '+',
    flat: false,
    on: 'surface',
  },
);

const { isMac, shortcutSymbol, optionSymbol, shiftSymbol } = usePlatform();

const getDisplayKey = (key: string): string => {
  const k = key.toLowerCase();

  const mapping: Record<string, string> = {
    control: shortcutSymbol,
    ctrl: shortcutSymbol,
    meta: isMac ? '⌘' : 'Win',
    cmd: '⌘',
    command: '⌘',
    alt: optionSymbol,
    option: optionSymbol,
    shift: shiftSymbol,

    enter: '↵',
    return: '↵',
    backspace: '⌫',
    escape: 'Esc',
    esc: 'Esc',
    tab: '⇥',
  };

  const val = mapping[k] || key;
  return val.length === 1 ? val.toUpperCase() : val;
};
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <template v-for="(key, index) in keys" :key="index">
      <BaseKbd :flat="flat" :on="on">{{ getDisplayKey(key) }}</BaseKbd>
      <span
        v-if="index < keys.length - 1"
        class="text-sm select-none font-sans"
        :class="'text-on-' + props.on + '-muted'"
      >
        {{ separator }}
      </span>
    </template>
  </span>
</template>
