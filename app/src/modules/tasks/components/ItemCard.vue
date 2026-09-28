<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Ellipsis,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  Pin,
  PinOff,
} from '@lucide/vue';
import {
  useSwipeToDismiss,
  SWIPE_SETTLE_MS,
  SWIPE_SETTLE_EASING,
} from '@/modules/tasks/composables/useSwipeToDismiss';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    title?: string;
    isCollapsed?: boolean;
    highlighted?: boolean;
    showMenuTrigger?: boolean;
    swipeable?: boolean;
    swipeAction?: 'archive' | 'keep' | 'delete';
    /** Shown beside the main action while the card rests open. */
    secondarySwipeAction?: 'edit' | 'pin' | 'unpin';
    confirmSwipe?: () => Promise<boolean>;
    reducedBottomMargin?: boolean;
    /** Whether dropped files are uploaded to this card. */
    acceptsFiles?: boolean;
  }>(),
  {
    isCollapsed: false,
    highlighted: false,
    showMenuTrigger: true,
    swipeable: false,
    swipeAction: 'archive',
    reducedBottomMargin: false,
    acceptsFiles: false,
  },
);

const emit = defineEmits<{
  (e: 'menu-click', event: MouseEvent): void;
  (e: 'swiped'): void;
  (e: 'swipe-secondary'): void;
  (e: 'files-dropped', files: File[]): void;
}>();

const cardRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

function collapseContainer() {
  const el = containerRef.value;
  if (!el) {
    emit('swiped');
    return;
  }

  const currentHeight = el.offsetHeight;

  el.style.height = currentHeight + 'px';
  el.style.overflow = 'hidden';
  el.style.marginBottom = '0';
  void el.offsetHeight;

  const easing = 'cubic-bezier(0.78, 0, 0.22, 1)';
  el.style.transition = `height 300ms ${easing}, margin 300ms ${easing}`;
  el.style.height = '0';

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.removeEventListener('transitionend', onEnd);
    clearTimeout(fallback);
    emit('swiped');
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'height') finish();
  };
  el.addEventListener('transitionend', onEnd);
  const fallback = setTimeout(finish, 350);
}

const swipeActionsRef = ref<HTMLElement | null>(null);

const SWIPE_ACTION_WIDTH = 76;

const {
  swipeOffset,
  revealProgress,
  isSwiping,
  isArmed,
  isDismissing,
  isActionsVisible,
  dismiss,
  close: closeSwipe,
} = useSwipeToDismiss(cardRef, {
  enabled: () => props.swipeable,
  revealWidth: () => SWIPE_ACTION_WIDTH * (props.secondarySwipeAction ? 2 : 1),
  actions: swipeActionsRef,
  confirmDismiss: props.confirmSwipe,
  onSlideOut: collapseContainer,
});

function runSecondarySwipeAction() {
  closeSwipe();
  emit('swipe-secondary');
}

const swipeActions = {
  archive: {
    icon: Archive,
    labelKey: 'tasks.list.tasks.menu.archive',
    colors: 'bg-danger text-on-danger',
  },
  keep: {
    icon: ArchiveRestore,
    labelKey: 'tasks.list.tasks.menu.unarchive',
    colors: 'bg-success text-on-success',
  },
  delete: {
    icon: Trash2,
    labelKey: 'common.buttons.delete',
    colors: 'bg-danger text-on-danger',
  },
  edit: {
    icon: Pencil,
    labelKey: 'common.buttons.edit',
    colors: 'bg-action text-on-action',
  },
  pin: {
    icon: Pin,
    labelKey: 'tasks.list.tasks.menu.pin',
    colors: 'bg-action text-on-action',
  },
  unpin: {
    icon: PinOff,
    labelKey: 'tasks.list.tasks.menu.unpin',
    colors: 'bg-action text-on-action',
  },
} as const;

const primarySwipeButton = computed(() => swipeActions[props.swipeAction]);
const secondarySwipeButton = computed(() =>
  props.secondarySwipeAction ? swipeActions[props.secondarySwipeAction] : null,
);

const swipeSettleTiming = `${SWIPE_SETTLE_MS}ms ${SWIPE_SETTLE_EASING}`;
/** Swaps the button layout while the finger keeps moving, so it runs on its own clock. */
const swipeTakeoverTiming = '320ms var(--ease-settle)';

const cardStyle = computed(() => {
  if (!isActionsVisible.value) return undefined;
  return {
    transform: `translateX(${-swipeOffset.value}px)`,
    transition: isSwiping.value ? 'none' : `transform ${swipeSettleTiming}`,
  };
});

// Covers only the uncovered strip plus the card's rounded corner, so colour
// never lines the card's top and bottom edges where a sub-pixel shift of the
// moving card would bare it.
const swipeTrayStyle = computed(() => ({
  width: `calc(${swipeOffset.value}px + var(--radius-xl))`,
  transition: isSwiping.value ? 'none' : `width ${swipeSettleTiming}`,
}));

/** Past the commit point the main action takes over the whole strip. */
const isPrimaryTakingOver = computed(() => isArmed.value || isDismissing.value);
const isSecondaryShown = computed(
  () => !!secondarySwipeButton.value && !isPrimaryTakingOver.value,
);

// The buttons fan out from under the card like a spread of cards: each one
// reaches a corner's width under its left neighbour, so the rounded corners
// above it show the next one instead of a gap. Widths are shares of the
// strip, so they keep up with the finger frame by frame while the takeover
// itself still eases.
const primaryButtonStyle = computed(() => ({
  width: isSecondaryShown.value
    ? 'calc(50% + var(--radius-xl))'
    : 'calc(100% + var(--radius-xl))',
  transition: `width ${swipeTakeoverTiming}`,
}));

// Taking over, it tucks back under the card: a corner's width is exactly the
// part the card's own rounded corner hides.
const secondaryButtonStyle = computed(() => ({
  width: isSecondaryShown.value
    ? 'calc(50% + var(--radius-xl))'
    : 'var(--radius-xl)',
  transition: `width ${swipeTakeoverTiming}`,
}));

// Once taking over, the icon rides along the card's edge instead of drifting
// to the middle of the widening button.
const primaryIconSlotStyle = computed(() => ({
  width: isPrimaryTakingOver.value
    ? `${SWIPE_ACTION_WIDTH}px`
    : 'calc(100% - var(--radius-xl))',
  transition: `width ${swipeTakeoverTiming}`,
}));

const swipeIconStyle = computed(() => ({
  opacity: revealProgress.value,
  transform: `scale(${0.6 + 0.4 * revealProgress.value})`,
  transition: isSwiping.value
    ? 'none'
    : `opacity ${swipeSettleTiming}, transform ${swipeSettleTiming}`,
}));

const transitionDuration = '350ms';

const transitionEasing = 'cubic-bezier(0.25, 1, 0.5, 1)';

function onEnter(el: Element) {
  const h = el as HTMLElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    h.style.height = '';
    h.style.opacity = '1';
    return;
  }
  h.style.height = '0';
  h.style.opacity = '0';
  void h.offsetHeight;
  h.style.transition = `height ${transitionDuration} ${transitionEasing}, opacity ${transitionDuration} ${transitionEasing}`;
  h.style.height = h.scrollHeight + 'px';
  h.style.opacity = '1';
}
function onAfterEnter(el: Element) {
  const h = el as HTMLElement;
  h.style.height = '';
  h.style.transition = '';
}
function onLeave(el: Element) {
  const h = el as HTMLElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    h.style.height = '0';
    h.style.opacity = '0';
    return;
  }
  h.style.height = h.scrollHeight + 'px';
  void h.offsetHeight;
  h.style.transition = `height ${transitionDuration} ${transitionEasing}, opacity ${transitionDuration} ${transitionEasing}`;
  h.style.height = '0';
  h.style.opacity = '0';
}

const isDragOver = ref(false);
let dragCounter = 0;

const isFileDrag = (e: DragEvent) =>
  props.acceptsFiles && (e.dataTransfer?.types.includes('Files') ?? false);

function onDragEnter(e: DragEvent) {
  if (isFileDrag(e)) {
    e.preventDefault();
    dragCounter++;
    isDragOver.value = true;
  }
}

function onDragOver(e: DragEvent) {
  if (isFileDrag(e)) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  }
}

function onDragLeave(e: DragEvent) {
  if (isFileDrag(e)) {
    dragCounter--;
    if (dragCounter === 0) {
      isDragOver.value = false;
    }
  }
}

function onDrop(e: DragEvent) {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dragCounter = 0;
  isDragOver.value = false;
  if (e.dataTransfer?.files.length) {
    const files = Array.from(e.dataTransfer.files).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf' ||
        f.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.type ===
          'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        f.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        /\.(docx|pptx|xlsx)$/i.test(f.name),
    );
    if (files.length > 0) {
      emit('files-dropped', files);
    }
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative z-20 focus-within:z-30 hover:z-30 has-[[role=menu]]:z-50"
  >
    <div
      v-if="isActionsVisible"
      ref="swipeActionsRef"
      class="absolute inset-y-0 right-0 isolate overflow-hidden rounded-r-xl"
      :style="swipeTrayStyle"
    >
      <!-- The strip the card has uncovered, right of its rounded corner. -->
      <div class="absolute inset-y-0 right-0 left-(--radius-xl)">
        <button
          v-if="secondarySwipeButton"
          type="button"
          class="absolute inset-y-0 -left-(--radius-xl) z-10 overflow-hidden rounded-r-xl pl-(--radius-xl) flex items-center justify-center cursor-pointer active:brightness-90"
          :class="secondarySwipeButton.colors"
          :style="secondaryButtonStyle"
          :aria-label="t(secondarySwipeButton.labelKey)"
          :title="t(secondarySwipeButton.labelKey)"
          @click="runSecondarySwipeAction"
        >
          <component
            :is="secondarySwipeButton.icon"
            :size="22"
            :style="swipeIconStyle"
          />
        </button>

        <button
          type="button"
          class="absolute inset-y-0 right-0 cursor-pointer active:brightness-90"
          :class="primarySwipeButton.colors"
          :style="primaryButtonStyle"
          :aria-label="t(primarySwipeButton.labelKey)"
          :title="t(primarySwipeButton.labelKey)"
          @click="dismiss"
        >
          <span
            class="absolute inset-y-0 left-(--radius-xl) flex items-center justify-center"
            :style="primaryIconSlotStyle"
          >
            <component
              :is="primarySwipeButton.icon"
              :size="22"
              :style="swipeIconStyle"
            />
          </span>
        </button>
      </div>
    </div>

    <div
      ref="cardRef"
      class="item-card relative bg-surface border border-ghost-border rounded-xl p-1 shadow-input overflow-visible cursor-default touch-pan-y"
      :class="{
        'transition-[padding,max-height,outline-color] duration-[300ms] ease-[cubic-bezier(0.78,0,0.22,1)]':
          isCollapsed,
        'transition-[outline-color] duration-(--duration-focus) ease-(--ease-focus)':
          acceptsFiles && !isCollapsed,
        'border-2 !border-accent': highlighted,
        'outline-2': acceptsFiles,
        'outline-transparent': acceptsFiles && !isDragOver,
        'outline-accent': isDragOver,
      }"
      :style="cardStyle"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="relative flex justify-between items-start gap-2 select-none">
        <div
          class="flex-1 min-w-0 mt-2 ml-2"
          :class="
            ($slots.body || $slots['content-after']) && !reducedBottomMargin
              ? 'mb-2'
              : 'mb-1'
          "
        >
          <div class="flex items-center gap-2">
            <slot name="checkbox"></slot>
            <slot name="title">
              <h3
                v-if="title"
                class="text-lg/6! overflow-hidden text-ellipsis whitespace-nowrap -my-[3px]!"
                :title="title"
              >
                {{ title }}
              </h3>
            </slot>
          </div>

          <Transition
            v-if="$slots.badges"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @leave="onLeave"
          >
            <div v-show="!isCollapsed" class="overflow-hidden">
              <div class="flex flex-wrap gap-1 items-center justify-start mt-1">
                <slot name="badges"></slot>
              </div>
            </div>
          </Transition>
        </div>

        <slot name="actions-pre"></slot>

        <slot name="menu-trigger">
          <BaseTooltip
            v-if="showMenuTrigger"
            :content="t('common.more')"
            placement="bottom"
          >
            <BaseButton
              variant="ghost"
              size="sm"
              :icon="Ellipsis"
              @click.stop="(e: MouseEvent) => $emit('menu-click', e)"
            />
          </BaseTooltip>
        </slot>

        <slot name="menu"></slot>
      </div>

      <Transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
        <div
          v-show="!isCollapsed && ($slots.body || $slots['content-after'])"
          class="opacity-100 overflow-hidden"
        >
          <div class="mx-2 mb-1">
            <div
              v-if="$slots.body"
              class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
            >
              <slot name="body"></slot>
            </div>
            <slot name="content-after"></slot>
          </div>
        </div>
      </Transition>

      <!-- An inset shadow on the card itself would paint beneath its images. -->
      <div
        v-if="acceptsFiles"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-10 rounded-[inherit] inset-shadow-drop-target transition-opacity duration-(--duration-focus) ease-(--ease-focus)"
        :class="isDragOver ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </div>
</template>
