<script setup lang="ts">
import { useId } from 'vue';

export interface ScheduleDayOption {
  id: string;
  label: string;
  /** The weekday shown above the label. */
  caption?: string;
  isToday?: boolean;
}

defineProps<{
  items: ScheduleDayOption[];
  activeId: string;
}>();

const emit = defineEmits<{
  (e: 'change', id: string): void;
}>();

const groupName = useId();
</script>

<template>
  <div role="radiogroup" class="grid auto-cols-fr grid-flow-col select-none">
    <label
      v-for="item in items"
      :key="item.id"
      class="group flex cursor-pointer flex-col items-center gap-1"
    >
      <input
        type="radio"
        class="sr-only"
        :name="groupName"
        :value="item.id"
        :checked="item.id === activeId"
        :aria-current="item.isToday ? 'date' : undefined"
        @change="emit('change', item.id)"
      />
      <span v-if="item.caption" class="text-xs font-medium text-on-ghost-muted">
        {{ item.caption }}
      </span>
      <span
        class="relative isolate flex size-10 items-center justify-center rounded-full text-lg tabular-nums transition-[scale] duration-150 ease-out group-active:scale-90 group-has-focus-visible:ring-2 group-has-focus-visible:ring-focus motion-reduce:transition-none"
      >
        <!-- Grows in on a settling curve but shrinks away quickly, so a tap answers at once without the outgoing circle lingering. -->
        <span
          class="absolute inset-0 -z-1 rounded-full transition-[scale,opacity] motion-reduce:transition-none"
          :class="[
            item.isToday ? 'bg-accent' : 'bg-action',
            item.id === activeId
              ? 'scale-100 opacity-100 duration-400 ease-(--ease-settle)'
              : 'scale-0 opacity-0 duration-200 ease-out',
          ]"
          aria-hidden="true"
        />
        <span
          class="transition-colors motion-reduce:transition-none"
          :class="
            item.id === activeId
              ? [
                  'font-bold duration-200',
                  item.isToday ? 'text-on-accent' : 'text-on-action',
                ]
              : [
                  'duration-150',
                  item.isToday
                    ? 'text-accent font-bold'
                    : 'text-on-ghost font-medium',
                ]
          "
        >
          {{ item.label }}
        </span>
      </span>
    </label>
  </div>
</template>
