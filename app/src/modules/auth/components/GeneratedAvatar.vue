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

const avatarData = computed(() => getAvatarData(props.name ?? ''));

const avatarStyle = computed(() => {
  const px = props.size * 4;
  const fontSize = (px / 5) * 3;
  return {
    width: `${px}px`,
    height: `${px}px`,
    fontSize: `${fontSize}px`,
    background: avatarData.value.background,
  };
});
</script>

<template>
  <div
    class="flex items-center justify-center font-bold text-white select-none rounded-full shrink-0"
    :style="avatarStyle"
  >
    {{ avatarData.letter }}
  </div>
</template>
