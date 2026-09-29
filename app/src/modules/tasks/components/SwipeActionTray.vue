<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  Pin,
  PinOff,
} from '@lucide/vue';
import {
  SWIPE_ACTION_WIDTH,
  SWIPE_SETTLE_TIMING,
  type SecondarySwipeAction,
  type SwipeAction,
} from '@/modules/tasks/composables/useSwipeCard';

const props = defineProps<{
  action: SwipeAction;
  secondaryAction?: SecondarySwipeAction;
  offset: number;
  revealProgress: number;
  isSwiping: boolean;
  /** Past the commit point, or sliding out: the main action takes over. */
  isTakingOver: boolean;
}>();

defineEmits<{
  (e: 'action'): void;
  (e: 'secondary-action'): void;
}>();

const { t } = useI18n();

const buttons = {
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

const primaryButton = computed(() => buttons[props.action]);
const secondaryButton = computed(() =>
  props.secondaryAction ? buttons[props.secondaryAction] : null,
);

/** Swaps the button layout while the finger keeps moving, so it runs on its own clock. */
const TAKEOVER_TIMING = '320ms var(--ease-settle)';

// Covers only the uncovered strip plus the card's rounded corner, so colour
// never lines the card's top and bottom edges where a sub-pixel shift of the
// moving card would bare it.
const trayStyle = computed(() => ({
  width: `calc(${props.offset}px + var(--radius-xl))`,
  transition: props.isSwiping ? 'none' : `width ${SWIPE_SETTLE_TIMING}`,
}));

const isSecondaryShown = computed(
  () => !!secondaryButton.value && !props.isTakingOver,
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
  transition: `width ${TAKEOVER_TIMING}`,
}));

// Taking over, it tucks back under the card: a corner's width is exactly the
// part the card's own rounded corner hides.
const secondaryButtonStyle = computed(() => ({
  width: isSecondaryShown.value
    ? 'calc(50% + var(--radius-xl))'
    : 'var(--radius-xl)',
  transition: `width ${TAKEOVER_TIMING}`,
}));

// Once taking over, the icon rides along the card's edge instead of drifting
// to the middle of the widening button.
const primaryIconSlotStyle = computed(() => ({
  width: props.isTakingOver
    ? `${SWIPE_ACTION_WIDTH}px`
    : 'calc(100% - var(--radius-xl))',
  transition: `width ${TAKEOVER_TIMING}`,
}));

const iconStyle = computed(() => ({
  opacity: props.revealProgress,
  transform: `scale(${0.6 + 0.4 * props.revealProgress})`,
  transition: props.isSwiping
    ? 'none'
    : `opacity ${SWIPE_SETTLE_TIMING}, transform ${SWIPE_SETTLE_TIMING}`,
}));
</script>

<template>
  <div
    class="absolute inset-y-0 right-0 isolate overflow-hidden rounded-r-xl"
    :style="trayStyle"
  >
    <!-- The strip the card has uncovered, right of its rounded corner. -->
    <div class="absolute inset-y-0 right-0 left-(--radius-xl)">
      <button
        v-if="secondaryButton"
        type="button"
        class="absolute inset-y-0 -left-(--radius-xl) z-10 overflow-hidden rounded-r-xl pl-(--radius-xl) flex items-center justify-center cursor-pointer active:brightness-90"
        :class="secondaryButton.colors"
        :style="secondaryButtonStyle"
        :aria-label="t(secondaryButton.labelKey)"
        :title="t(secondaryButton.labelKey)"
        @click="$emit('secondary-action')"
      >
        <component :is="secondaryButton.icon" :size="22" :style="iconStyle" />
      </button>

      <button
        type="button"
        class="absolute inset-y-0 right-0 cursor-pointer active:brightness-90"
        :class="primaryButton.colors"
        :style="primaryButtonStyle"
        :aria-label="t(primaryButton.labelKey)"
        :title="t(primaryButton.labelKey)"
        @click="$emit('action')"
      >
        <span
          class="absolute inset-y-0 left-(--radius-xl) flex items-center justify-center"
          :style="primaryIconSlotStyle"
        >
          <component :is="primaryButton.icon" :size="22" :style="iconStyle" />
        </span>
      </button>
    </div>
  </div>
</template>
