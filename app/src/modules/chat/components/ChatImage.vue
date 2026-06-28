<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';

const props = defineProps<{
  src: string;
  alt?: string;
  title?: string;
}>();

const isLoaded = ref(false);
const errorCount = ref(0);
const currentSrc = ref(props.src);

watch(
  () => props.src,
  (newSrc) => {
    currentSrc.value = newSrc;
    isLoaded.value = false;
    errorCount.value = 0;
  },
);

function handleLoad() {
  isLoaded.value = true;
}

function handleError() {
  const isPollinations = props.src.includes('pollinations.ai');
  const maxRetries = isPollinations ? 15 : 2;
  if (errorCount.value < maxRetries) {
    errorCount.value++;
    setTimeout(() => {
      let cleanUrl = props.src;
      if (cleanUrl.includes('://')) {
        try {
          const url = new URL(cleanUrl);
          url.searchParams.set('retry', String(errorCount.value));
          url.searchParams.set('t', String(Date.now()));
          cleanUrl = url.toString();
        } catch {
          const separator = cleanUrl.includes('?') ? '&' : '?';
          cleanUrl = `${cleanUrl}${separator}t=${Date.now()}&retry=${errorCount.value}`;
        }
      } else {
        const separator = cleanUrl.includes('?') ? '&' : '?';
        cleanUrl = `${cleanUrl}${separator}t=${Date.now()}&retry=${errorCount.value}`;
      }
      currentSrc.value = cleanUrl;
    }, 2000);
  }
}
</script>

<template>
  <div class="relative my-2 w-full max-w-full">
    <!-- Skeleton loading state shown until the image loads successfully -->
    <BaseSkeleton
      v-if="!isLoaded"
      radius="2xl"
      width="full"
      height=""
      class="max-w-full my-2 aspect-square"
    />
    <img
      v-show="isLoaded"
      :src="currentSrc"
      :alt="alt"
      :title="title"
      class="rounded-2xl max-w-full h-auto block"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>
