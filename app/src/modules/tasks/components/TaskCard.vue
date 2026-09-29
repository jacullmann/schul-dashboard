<script setup lang="ts">
import {
  computed,
  ref,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { Ellipsis, Pin } from '@lucide/vue';
import { useLongPress } from '@/common/composables/useLongPress';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useIsMobileViewport } from '@/common/composables/useViewport';
import { useSwipeCard } from '@/modules/tasks/composables/useSwipeCard';
import { useFileDrop } from '@/modules/tasks/composables/useFileDrop';
import type { HwItem, TaskMenuAction } from '@/modules/tasks/types';
import { taskRoute } from '@/modules/tasks/utils/routes';
import { menuAnchor, type MenuAnchor } from '@/modules/tasks/utils/menuAnchor';
import SwipeActionTray from './SwipeActionTray.vue';
import TaskMenu from './TaskMenu.vue';
import TaskMeta from './TaskMeta.vue';

const props = defineProps<{
  item: HwItem;
  showType: boolean;
  isArchiveView: boolean;
  isChecked: boolean;
  isPinned: boolean;
  isMenuOpen: boolean;
  canCheck: boolean;
  canEdit: boolean;
  canAddNote: boolean;
  canDelete: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-check'): void;
  (e: 'toggle-pin'): void;
  (e: 'swipe'): void;
  (e: 'menu-action', action: TaskMenuAction): void;
  (e: 'open-menu'): void;
  (e: 'close-menu'): void;
  (e: 'image-drop', files: File[]): void;
}>();

const { t } = useI18n();
const groupId = useGroupPageId();
// On phones the card's menu opens on a long press, which frees the row for the
// title; the task's own page keeps the button.
const isMobile = useIsMobileViewport();

const to = computed(() => taskRoute(groupId, props.item.id));

const menuPosition = ref<MenuAnchor | null>(null);

function openMenuAt(event: MouseEvent) {
  menuPosition.value = menuAnchor(event);
  emit('open-menu');
}

function handleMenuClick(event: MouseEvent) {
  if (props.isMenuOpen) emit('close-menu');
  else openMenuAt(event);
}

watch(
  () => props.isMenuOpen,
  (isOpen) => {
    if (!isOpen) menuPosition.value = null;
  },
);

/** Controls that answer a press themselves, so the card's hold may not. */
const IGNORED_REGIONS = ['button', 'input', '.checkbox', '[role=menu]'].join(
  ', ',
);

const { handlers: longPressHandlers } = useLongPress(openMenuAt, {
  ignore: IGNORED_REGIONS,
  grow: '.item-card',
});

const { isDragOver, handlers: dropHandlers } = useFileDrop((files) =>
  emit('image-drop', files),
);

const secondarySwipeAction = computed(() => {
  if (props.canEdit) return 'edit';
  if (!props.canCheck) return undefined;
  return props.isPinned ? 'unpin' : 'pin';
});

const container = useTemplateRef<HTMLElement>('container');
const card = useTemplateRef<HTMLElement>('card');
const tray = useTemplateRef<ComponentPublicInstance>('tray');

const {
  swipeOffset,
  revealProgress,
  isSwiping,
  isActionsVisible,
  isTakingOver,
  isRevealed,
  cardStyle,
  dismiss,
  close: closeSwipe,
} = useSwipeCard(
  container,
  card,
  computed(() => tray.value?.$el ?? null),
  {
    enabled: true,
    hasSecondaryAction: () => !!secondarySwipeAction.value,
    onDismissed: () => emit('swipe'),
  },
);

function runSecondarySwipeAction() {
  closeSwipe();
  emit('menu-action', secondarySwipeAction.value === 'edit' ? 'edit' : 'pin');
}
</script>

<template>
  <div
    ref="container"
    class="long-press-target relative z-20 focus-within:z-30 hover:z-30 has-[[role=menu]]:z-50"
    v-on="longPressHandlers"
  >
    <SwipeActionTray
      v-if="isActionsVisible"
      ref="tray"
      :action="isArchiveView ? 'keep' : 'archive'"
      :secondary-action="secondarySwipeAction"
      :offset="swipeOffset"
      :reveal-progress="revealProgress"
      :is-swiping="isSwiping"
      :is-taking-over="isTakingOver"
      @action="dismiss"
      @secondary-action="runSecondarySwipeAction"
    />

    <div
      v-wave
      ref="card"
      class="item-card relative bg-canvas border-ghost-border p-1 shadow-input cursor-default touch-pan-y outline-2 transition-[outline-color,border-color] duration-(--duration-focus) ease-(--ease-focus) [@media(hover:hover)]:has-[.item-card-link:hover]:bg-linear-to-b [@media(hover:hover)]:has-[.item-card-link:hover]:from-ghost-hover [@media(hover:hover)]:has-[.item-card-link:hover]:to-ghost-hover has-[.item-card-link:focus-visible]:shadow-focus-ring"
      :class="[
        isDragOver ? 'outline-accent' : 'outline-transparent',
        isRevealed ? 'rounded-xl' : 'rounded-none md:rounded-xl',
      ]"
      :style="cardStyle"
      v-on="dropHandlers"
    >
      <!-- Not positioned itself: the title's link has to stretch over the
           whole card, so the controls are lifted above it instead. -->
      <div class="flex justify-between items-start gap-2 select-none">
        <div class="flex gap-2 min-w-0 mt-2 ml-3 md:ml-2 mb-1">
          <span v-if="canCheck" class="relative z-10 flex">
            <BaseCheckbox
              class="checkbox"
              :checked="isChecked"
              @change="$emit('toggle-check')"
            />
          </span>
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <h3
              class="min-w-0 text-lg/6! overflow-hidden text-ellipsis whitespace-nowrap -my-[3px]!"
              :title="item.title"
            >
              <RouterLink
                :to="to"
                class="item-card-link outline-none after:absolute after:inset-0"
                >{{ item.title }}</RouterLink
              >
            </h3>

            <TaskMeta
              :item="item"
              :show-type="showType"
              :show-creator="false"
            />
          </div>
        </div>

        <div
          v-if="isPinned || !isMobile"
          class="relative z-10 flex items-start gap-2"
        >
          <BaseTooltip
            v-if="isPinned"
            :content="t('tasks.list.tasks.menu.unpin')"
            placement="bottom"
          >
            <BaseButton
              variant="ghost"
              size="sm"
              :aria-label="t('tasks.list.tasks.menu.unpin')"
              :icon="Pin"
              icon-classes="fill-current"
              @click.stop="$emit('toggle-pin')"
            />
          </BaseTooltip>

          <BaseTooltip
            v-if="!isMobile"
            :content="t('common.more')"
            placement="bottom"
          >
            <BaseButton
              variant="ghost"
              size="sm"
              :aria-label="t('common.more')"
              :icon="Ellipsis"
              @click.stop="handleMenuClick"
            />
          </BaseTooltip>
        </div>

        <TaskMenu
          :open="isMenuOpen"
          :anchor="menuPosition"
          :is-pinned="isPinned"
          :is-in-archive="isArchiveView"
          :can-edit="canEdit"
          :can-add-note="canAddNote"
          :can-delete="canDelete"
          @action="(action) => $emit('menu-action', action)"
          @close="$emit('close-menu')"
        />
      </div>

      <!-- An inset shadow on the card itself would paint beneath its content. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-10 rounded-[inherit] inset-shadow-drop-target transition-opacity duration-(--duration-focus) ease-(--ease-focus)"
        :class="isDragOver ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </div>
</template>
