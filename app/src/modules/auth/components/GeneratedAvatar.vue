<script setup lang="ts">
import { computed } from 'vue';
import { getAvatarData } from '@/modules/auth/utils/avatar';

const props = withDefaults(
  defineProps<{
    name?: string;
    size?: number;
  }>(),
  {
    size: 8,
  },
);

const avatarLetter = computed(() => {
  if (props.name) return getAvatarData(props.name).letter;
  return '?';
});

const avatarColor = computed(() => {
  if (props.name) return getAvatarData(props.name).color;
  return '#777'; // Fallback
});

const avatarStyle = computed(() => {
  const px = props.size * 4;
  // Font size is half of the avatar size (e.g. 32px avatar -> 16px font-size)
  const fontSize = px / 2;
  return {
    width: `${px}px`,
    height: `${px}px`,
    fontSize: `${fontSize}px`,
    backgroundColor: avatarColor.value,
  };
});
</script>

<template>
  <div
    class="flex items-center justify-center font-semibold text-white select-none rounded-full shrink-0"
    :style="avatarStyle"
  >
    {{ avatarLetter }}
  </div>
</template>
