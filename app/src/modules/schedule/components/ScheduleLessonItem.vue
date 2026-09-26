<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLongPress } from '@/common/composables/useLongPress';

const emit = defineEmits<{
  (e: 'select', lesson: any, event?: MouseEvent): void;
  (e: 'contextmenu', lesson: any, event: UIEvent): void;
}>();

const props = withDefaults(
  defineProps<{
    lesson: any;
    hasBorder: boolean;
    isClickable?: boolean;
    isSelected?: boolean;
    hasContextMenu?: boolean;
    getDisplayName: (l: any) => string;
  }>(),
  { hasContextMenu: false },
);

const { t } = useI18n();

const { handlers } = useLongPress((event) =>
  emit('contextmenu', props.lesson, event),
);

function onClick(event: MouseEvent) {
  if (!props.isClickable) return;

  emit('select', props.lesson, event);
}

const strongText = computed(() => [
  props.isSelected ? 'text-on-action' : 'text-on-ghost',
  'group-[.highlight-active]:text-on-action!',
]);

const mutedText = computed(() => [
  props.isSelected ? 'text-on-action-muted' : 'text-on-ghost-muted',
  'group-[.highlight-active]:text-on-action-muted!',
]);

/* A cancelled lesson shows only that it is cancelled, not what else changed. */
const nameChanged = computed(
  () =>
    !props.lesson.cancelled &&
    props.lesson._original &&
    props.getDisplayName(props.lesson) !==
      props.getDisplayName(props.lesson._original),
);

const roomChanged = computed(
  () =>
    !props.lesson.cancelled &&
    props.lesson._original &&
    props.lesson.room !== props.lesson._original.room,
);
</script>

<template>
  <div
    class="js-lesson-card flex-1 flex flex-col justify-start h-full max-xs:px-2.5 max-xs:py-1.5 px-2 py-1 select-none"
    :class="[
      hasBorder
        ? 'border-b border-ghost-border xs:group-[.current-day]:border-surface-hover-border! group-[.highlight-active]:border-on-ghost-muted!'
        : '',
      isClickable
        ? 'cursor-pointer transition-colors duration-150 hover:bg-surface-hover'
        : '',
      isSelected ? 'bg-action! text-on-action!' : '',
      hasContextMenu ? 'long-press-target' : '',
    ]"
    v-on="hasContextMenu ? handlers : {}"
    @click.stop="onClick"
  >
    <div>
      <div
        class="font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis flex items-center"
        :class="lesson.cancelled ? mutedText : strongText"
      >
        <span
          class="flex-1 min-w-0 truncate"
          :class="{ 'line-through': lesson.cancelled }"
        >
          <template v-if="nameChanged">
            <span class="line-through font-normal mr-1" :class="mutedText">
              {{ getDisplayName(lesson._original) }}
            </span>
            <span class="font-bold" :class="strongText">
              {{ getDisplayName(lesson) }}
            </span>
          </template>
          <template v-else>
            {{ getDisplayName(lesson) }}
          </template>
        </span>

        <span
          v-if="lesson.courseCount && lesson.courseCount > 1"
          class="text-sm shrink-0 inline-block px-2.5 py-0.5 ml-2 rounded-full font-semibold max-w-full group-[.highlight-active]:bg-on-action/15! group-[.highlight-active]:text-on-action-muted!"
          :class="
            isSelected
              ? 'text-on-action-muted bg-on-action/15'
              : 'bg-ghost-hover text-on-ghost-muted'
          "
        >
          {{ lesson.courseCount }}
        </span>
        <span
          v-else-if="lesson.courseName || lesson.courses?.name"
          class="font-normal truncate ml-1 min-w-0 max-w-[55%]"
          :class="mutedText"
        >
          ({{ lesson.courses?.name || lesson.courseName }})
        </span>
      </div>

      <div
        v-if="lesson.cancelled"
        class="text-danger font-bold text-base group-[.highlight-active]:text-danger!"
      >
        {{ t('schedule.cancelled') }}
      </div>

      <div class="flex justify-between text-sm" :class="mutedText">
        <span
          class="inline-flex gap-1 items-center"
          :class="{ 'line-through': lesson.cancelled }"
        >
          <template v-if="roomChanged">
            <span class="line-through font-normal mr-1" :class="mutedText">
              {{ lesson._original.room }}
            </span>
            <span class="font-bold" :class="strongText">
              {{ lesson.room }}
            </span>
          </template>
          <template v-else>
            {{ lesson.room || '-' }}
          </template>
        </span>
      </div>
    </div>
  </div>
</template>
