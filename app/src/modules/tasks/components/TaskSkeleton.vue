<script setup lang="ts">
import { entranceDelay } from '@/modules/tasks/utils/entrance';

withDefaults(
  defineProps<{
    count?: number;
    /** Where the first card falls in the page's entrance order. */
    entranceOrder?: number;
  }>(),
  {
    count: 5,
    entranceOrder: 0,
  },
);

const TITLE_WIDTHS = ['60%', '75%', '50%', '68%'];
</script>

<template>
  <!-- Mirrors the list of cards, so each line sits where its text will. -->
  <div class="flex flex-col max-md:-mx-4">
    <!-- A card still waiting for its entrance stays hidden while the skeleton leaves. -->
    <div
      v-for="n in count"
      :key="n"
      class="animate-enter in-[.skeleton-leaving]:[animation-play-state:paused]"
      :style="{ '--enter-delay': entranceDelay(entranceOrder + n - 1) }"
    >
      <div v-if="n > 1" class="border-b border-ghost-border ml-10.5 mr-4"></div>
      <div class="p-1">
        <div class="flex gap-2 mt-2 ml-3 md:ml-2 mb-1">
          <span class="size-4.5 shrink-0"></span>
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <div class="flex items-center h-6 -my-[3px]">
              <div
                class="h-4 rounded-full bg-surface-highlight animate-pulse"
                :style="{ width: TITLE_WIDTHS[(n - 1) % TITLE_WIDTHS.length] }"
              ></div>
            </div>
            <div class="flex items-center h-6">
              <div
                class="h-3.5 w-2/5 rounded-full bg-surface-highlight animate-pulse"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
