<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineEmits<{
  (e: 'select', lesson: any, event?: MouseEvent): void;
  (e: 'contextmenu', lesson: any, event: UIEvent): void;
}>();

defineProps<{
  lesson: any;
  hasBorder: boolean;
  isClickable?: boolean;
  isSelected?: boolean;
  getDisplayName: (l: any) => string;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="js-lesson-card flex-1 flex flex-col justify-start h-full max-[500px]:px-2.5 max-[500px]:py-1.5 px-2 py-1 select-none"
    :class="[
      hasBorder
        ? 'border-b border-ghost-border min-[501px]:group-[.current-day]:border-surface-hover-border! group-[.highlight-active]:border-on-ghost-muted!'
        : '',
      isClickable
        ? 'cursor-pointer transition-colors duration-150 hover:bg-surface-hover'
        : '',
      isSelected ? 'min-[501px]:bg-action! min-[501px]:text-on-action!' : '',
    ]"
    @contextmenu.prevent.stop="$emit('contextmenu', lesson, $event)"
    @click.stop="isClickable ? $emit('select', lesson, $event) : undefined"
  >
    <div v-if="lesson.cancelled">
      <div
        class="font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5 group-[.highlight-active]:text-on-action-muted!"
        :class="
          isSelected
            ? 'min-[501px]:text-on-action-muted text-on-ghost-muted'
            : 'text-on-ghost-muted'
        "
      >
        <span class="line-through truncate">{{ getDisplayName(lesson) }}</span>
        <span
          v-if="lesson.courseCount && lesson.courseCount > 1"
          class="text-[9px] shrink-0 inline-block px-1.5 py-0.5 rounded bg-ghost-hover text-on-ghost-muted font-semibold truncate max-w-full"
          :class="
            isSelected
              ? 'min-[501px]:text-on-action-muted min-[501px]:bg-on-action/10'
              : ''
          "
        >
          {{ lesson.courseCount }} Kurse
        </span>
        <span
          v-else-if="lesson.courseName || lesson.courses?.name"
          class="text-[9px] shrink-0 inline-block px-1.5 py-0.5 rounded bg-ghost-hover text-on-ghost-muted font-semibold truncate max-w-full"
          :class="
            isSelected
              ? 'min-[501px]:text-on-action-muted min-[501px]:bg-on-action/10'
              : ''
          "
        >
          {{ lesson.courses?.name || lesson.courseName }}
        </span>
      </div>
      <div
        class="text-danger font-bold text-base group-[.highlight-active]:text-danger!"
      >
        {{ t('schedule.cancelled') }}
      </div>
      <div
        class="flex justify-between text-sm group-[.highlight-active]:text-on-action-muted!"
        :class="
          isSelected
            ? 'min-[501px]:text-on-action-muted text-on-ghost-muted'
            : 'text-on-ghost-muted'
        "
      >
        <span class="line-through">{{ lesson.room }}</span>
      </div>
    </div>

    <div v-else>
      <div
        class="font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis flex items-center group-[.highlight-active]:text-on-action!"
        :class="
          isSelected
            ? 'min-[501px]:text-on-action text-on-ghost'
            : 'text-on-ghost'
        "
      >
        <span class="truncate">
          <template
            v-if="
              lesson._original &&
              getDisplayName(lesson) !== getDisplayName(lesson._original)
            "
          >
            <span
              class="line-through font-normal group-[.highlight-active]:text-on-action-muted! mr-1"
              :class="
                isSelected
                  ? 'min-[501px]:text-on-action-muted text-on-ghost-muted'
                  : 'text-on-ghost-muted'
              "
            >
              {{ getDisplayName(lesson._original) }}
            </span>
            <span
              class="font-bold group-[.highlight-active]:text-on-action!"
              :class="
                isSelected
                  ? 'min-[501px]:text-on-action text-on-ghost'
                  : 'text-on-ghost'
              "
            >
              {{ getDisplayName(lesson) }}
            </span>
          </template>
          <template v-else>
            {{ getDisplayName(lesson) }}
          </template>
        </span>

        <span
          v-if="lesson.courseCount && lesson.courseCount > 1"
          class="text-sm shrink-0 inline-block px-2.5 py-0.5 ml-2 rounded-full font-semibold max-w-full"
          :class="
            isSelected
              ? 'min-[501px]:text-on-action-muted min-[501px]:bg-on-action/15 bg-ghost-hover text-on-ghost-muted'
              : 'bg-ghost-hover text-on-ghost-muted'
          "
        >
          {{ lesson.courseCount }}
        </span>
        <span
          v-else-if="lesson.courseName || lesson.courses?.name"
          class="font-normal truncate ml-1 max-w-full"
          :class="
            isSelected
              ? 'min-[501px]:text-on-action-muted text-on-ghost-muted'
              : 'text-on-ghost-muted'
          "
        >
          ({{ lesson.courses?.name || lesson.courseName }})
        </span>
      </div>

      <div
        class="flex justify-between text-sm group-[.highlight-active]:text-on-action-muted!"
        :class="
          isSelected
            ? 'min-[501px]:text-on-action-muted text-on-ghost-muted'
            : 'text-on-ghost-muted'
        "
      >
        <span class="inline-flex gap-1 items-center">
          <template
            v-if="lesson._original && lesson.room !== lesson._original.room"
          >
            <span
              class="line-through font-normal group-[.highlight-active]:text-on-action-muted! mr-1"
              :class="
                isSelected
                  ? 'min-[501px]:text-on-action-muted text-on-ghost-muted'
                  : 'text-on-ghost-muted'
              "
            >
              {{ lesson._original.room }}
            </span>
            <span
              class="font-bold group-[.highlight-active]:text-on-action!"
              :class="
                isSelected
                  ? 'min-[501px]:text-on-action text-on-ghost'
                  : 'text-on-ghost'
              "
            >
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
