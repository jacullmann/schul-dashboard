<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<!-- A task shown for reference outside the task pages: on the dashboard, in
     reports, or as the duplicate a new task may repeat. -->
<template>
  <div
    class="relative bg-surface border border-ghost-border rounded-xl p-1 shadow-input cursor-default"
  >
    <div class="flex justify-between items-start gap-2 select-none">
      <div
        class="flex-1 min-w-0 mt-2 ml-2"
        :class="$slots.body || $slots['content-after'] ? 'mb-2' : 'mb-1'"
      >
        <div class="flex items-center gap-2">
          <slot name="checkbox"></slot>
          <h3
            v-if="title"
            class="text-lg/6! overflow-hidden text-ellipsis whitespace-nowrap -my-[3px]!"
            :title="title"
          >
            {{ title }}
          </h3>
        </div>

        <div
          v-if="$slots.badges"
          class="flex flex-wrap gap-1 items-center justify-start mt-1"
        >
          <slot name="badges"></slot>
        </div>
      </div>

      <slot name="actions-pre"></slot>
    </div>

    <div v-if="$slots.body || $slots['content-after']" class="mx-2 mb-1">
      <div
        v-if="$slots.body"
        class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
      >
        <slot name="body"></slot>
      </div>
      <slot name="content-after"></slot>
    </div>
  </div>
</template>
