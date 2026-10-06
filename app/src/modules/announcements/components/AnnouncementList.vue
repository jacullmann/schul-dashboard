<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { formatDate } from '@/utils/date-formatter';
import type { FeedAnnouncement } from '@/modules/announcements/types';

defineProps<{
  announcements: FeedAnnouncement[];
}>();

defineSlots<{
  actions?(props: { announcement: FeedAnnouncement }): unknown;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="announcements.length === 0"
    class="text-center p-8 text-on-ghost-muted text-base"
  >
    {{ t('announcements.list.empty_state') }}
  </div>
  <ul v-else class="flex flex-col">
    <template
      v-for="(ann, index) in announcements"
      :key="`${ann.scope}:${ann.id}`"
    >
      <li
        v-if="index > 0"
        role="presentation"
        class="task-separator border-b border-ghost-border ml-4"
      ></li>
      <li class="flex gap-3 py-2">
        <span
          class="w-1 shrink-0 my-1 rounded-full"
          :class="ann.important ? 'bg-danger' : 'bg-action'"
        ></span>
        <div class="flex flex-col flex-1 min-w-0 gap-1">
          <div class="text-base text-on-ghost break-words">
            {{ ann.content }}
          </div>
          <div class="flex justify-between items-center gap-2">
            <time
              :datetime="ann.publishedAt"
              class="text-sm text-on-ghost-muted"
              >{{ formatDate(ann.publishedAt, t) }}</time
            >
            <slot name="actions" :announcement="ann"></slot>
          </div>
        </div>
      </li>
    </template>
  </ul>
</template>
