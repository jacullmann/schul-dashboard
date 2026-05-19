<script setup lang="ts">
import { computed } from 'vue';
import { getAvatarData } from '@/modules/auth/utils/avatar';

const props = defineProps<{
  email?: string;
  letter?: string;
  color?: string;
}>();

const avatarLetter = computed(() => {
  if (props.letter) return props.letter;
  if (props.email) return getAvatarData(props.email).letter;
  return '?';
});

const avatarColor = computed(() => {
  if (props.color) return props.color;
  if (props.email) return getAvatarData(props.email).color;
  return '#777'; // Fallback
});
</script>

<template>
    <div
      class="size-8 rounded-full flex items-center justify-center font-semibold text-white text-base select-none"
      :style="{ backgroundColor: avatarColor }"
    >
      {{ avatarLetter }}
    </div>
</template>
