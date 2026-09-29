<script setup lang="ts">
import { computed, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { Ellipsis } from '@lucide/vue';
import { useSwipeCard } from '@/modules/tasks/composables/useSwipeCard';
import type { PrivateTask } from '@/modules/tasks/types';
import SwipeActionTray from './SwipeActionTray.vue';

const props = defineProps<{
  task: PrivateTask;
  swipeable: boolean;
  confirmDelete: () => Promise<boolean>;
}>();

const emit = defineEmits<{
  (e: 'toggle-completion'): void;
  /** The swipe already asked, so the task goes without another question. */
  (e: 'delete'): void;
  (e: 'edit'): void;
  (e: 'duplicate'): void;
  (e: 'menu-click', event: MouseEvent): void;
}>();

const { t } = useI18n();

const container = useTemplateRef<HTMLElement>('container');
const card = useTemplateRef<HTMLElement>('card');
const tray = useTemplateRef<ComponentPublicInstance>('tray');

const {
  revealedOffset,
  activeSide,
  isSwiping,
  isActionsVisible,
  isTakingOver,
  cardStyle,
  dismiss,
  close: closeSwipe,
} = useSwipeCard(
  container,
  card,
  computed(() => tray.value?.$el ?? null),
  {
    enabled: () => props.swipeable,
    hasSecondaryAction: true,
    hasStartAction: true,
    confirmDismiss: props.confirmDelete,
    onDismissed: () => emit('delete'),
    onStartCommit: () => emit('edit'),
  },
);

function runSwipeAction() {
  if (activeSide.value === 'right') {
    void dismiss();
    return;
  }
  closeSwipe();
  emit('edit');
}

function duplicateFromSwipe() {
  closeSwipe();
  emit('duplicate');
}

const COLLAPSE_DURATION = '350ms';
const COLLAPSE_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A completed task folds away its description to make room for open ones.
function onEnter(el: Element) {
  const h = el as HTMLElement;
  if (prefersReducedMotion()) {
    h.style.height = '';
    h.style.opacity = '1';
    return;
  }
  h.style.height = '0';
  h.style.opacity = '0';
  void h.offsetHeight;
  h.style.transition = `height ${COLLAPSE_DURATION} ${COLLAPSE_EASING}, opacity ${COLLAPSE_DURATION} ${COLLAPSE_EASING}`;
  h.style.height = `${h.scrollHeight}px`;
  h.style.opacity = '1';
}

function onAfterEnter(el: Element) {
  const h = el as HTMLElement;
  h.style.height = '';
  h.style.transition = '';
}

function onLeave(el: Element) {
  const h = el as HTMLElement;
  if (prefersReducedMotion()) {
    h.style.height = '0';
    h.style.opacity = '0';
    return;
  }
  h.style.height = `${h.scrollHeight}px`;
  void h.offsetHeight;
  h.style.transition = `height ${COLLAPSE_DURATION} ${COLLAPSE_EASING}, opacity ${COLLAPSE_DURATION} ${COLLAPSE_EASING}`;
  h.style.height = '0';
  h.style.opacity = '0';
}
</script>

<template>
  <div
    ref="container"
    class="relative z-20 focus-within:z-30 hover:z-30 has-[[role=menu]]:z-50"
  >
    <SwipeActionTray
      v-if="isActionsVisible"
      ref="tray"
      :key="activeSide"
      :side="activeSide"
      :action="activeSide === 'left' ? 'edit' : 'delete'"
      :secondary-action="activeSide === 'right' ? 'duplicate' : undefined"
      :offset="revealedOffset"
      :is-swiping="isSwiping"
      :is-taking-over="isTakingOver"
      @action="runSwipeAction"
      @secondary-action="duplicateFromSwipe"
    />

    <div
      ref="card"
      class="item-card relative bg-surface border border-ghost-border rounded-xl p-1 shadow-input cursor-default touch-pan-y"
      :style="cardStyle"
    >
      <div class="relative flex justify-between items-start gap-2 select-none">
        <div
          class="flex-1 min-w-0 mt-2 ml-2"
          :class="task.description ? 'mb-2' : 'mb-1'"
        >
          <div class="flex items-center gap-2">
            <BaseCheckbox
              class="checkbox"
              :checked="task.completed"
              @change="$emit('toggle-completion')"
            />
            <h3
              class="text-lg/6! overflow-hidden text-ellipsis whitespace-nowrap -my-[3px]!"
              :title="task.title"
            >
              {{ task.title }}
            </h3>
          </div>
        </div>

        <BaseTooltip :content="t('common.more')" placement="bottom">
          <BaseButton
            variant="ghost"
            size="sm"
            :aria-label="t('common.more')"
            :icon="Ellipsis"
            @click.stop="(e: MouseEvent) => $emit('menu-click', e)"
          />
        </BaseTooltip>

        <slot name="menu"></slot>
      </div>

      <Transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
        <div
          v-if="task.description"
          v-show="!task.completed"
          class="overflow-hidden"
        >
          <!-- prettier-ignore -->
          <div class="mx-2 mb-1 text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text">{{ task.description }}</div>
        </div>
      </Transition>
    </div>
  </div>
</template>
