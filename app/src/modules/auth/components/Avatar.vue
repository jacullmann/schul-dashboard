<script setup lang="ts">
import { computed } from 'vue';
import GeneratedAvatar from '@/modules/auth/components/GeneratedAvatar.vue';

const props = withDefaults(
  defineProps<{
    name?: string;
    picture?: string;
    size?: number;
    unread?: boolean;
  }>(),
  {
    size: 8,
    unread: false,
  },
);

const avatarStyle = computed(() => {
  const px = props.size * 4;
  return {
    width: `${px}px`,
    height: `${px}px`,
  };
});
</script>

<template>
  <div
    class="flex relative items-center justify-center overflow-hidden shrink-0"
    :style="avatarStyle"
  >
    <img
      v-if="picture"
      :src="picture"
      alt="Profile Picture"
      class="w-full h-full object-cover rounded-full"
    />

    <GeneratedAvatar v-else :name="name" :size="size" />

    <NotificationDot
      v-if="unread"
      class="absolute top-0 right-0"
      :size="size / 4"
    />
  </div>
</template>
