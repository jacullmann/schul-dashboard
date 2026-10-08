<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import GeneratedAvatar from '@/modules/auth/components/GeneratedAvatar.vue';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    name?: string;
    picture?: string | null;
    size?: number;
  }>(),
  {
    size: 8,
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
    class="flex items-center justify-center overflow-hidden shrink-0"
    :style="avatarStyle"
  >
    <img
      v-if="picture"
      :src="picture"
      :alt="t('auth.avatar.alt')"
      class="w-full h-full object-cover rounded-full"
    />

    <GeneratedAvatar v-else :name="name" :size="size" />
  </div>
</template>
