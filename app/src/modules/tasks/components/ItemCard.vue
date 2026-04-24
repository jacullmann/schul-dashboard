<script setup lang="ts">
import { ref, computed } from 'vue';
import { Ellipsis, Archive, ArchiveRestore, UploadCloud } from '@lucide/vue';
import { useSwipeToDismiss } from '@/modules/tasks/composables/useSwipeToDismiss';

const props = withDefaults(
  defineProps<{
    title?: string;
    isCollapsed?: boolean;
    highlighted?: boolean;
    showMenuTrigger?: boolean;
    swipeable?: boolean;
    swipeAction?: 'archive' | 'keep';
  }>(),
  {
    isCollapsed: false,
    highlighted: false,
    showMenuTrigger: true,
    swipeable: false,
    swipeAction: 'archive',
  },
);

const emit = defineEmits<{
  (e: 'menu-click', event: MouseEvent): void;
  (e: 'swiped'): void;
  (e: 'files-dropped', files: File[]): void;
}>();

const cardRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);

// Smooth height-collapse of the entire row after the card has slid off screen
function collapseContainer() {
  const el = containerRef.value;
  if (!el) {
    emit('swiped');
    return;
  }

  const currentHeight = el.offsetHeight;

  // Pin height to measured value, then animate to 0
  el.style.height = currentHeight + 'px';
  el.style.overflow = 'hidden';
  el.style.marginBottom = '0'; // counteract the flex gap on the parent .items
  void el.offsetHeight; // flush

  const easing = 'cubic-bezier(0.78, 0, 0.22, 1)';
  el.style.transition = `height 300ms ${easing}, margin 300ms ${easing}`;
  el.style.height = '0';

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName !== 'height') return;
    el.removeEventListener('transitionend', onEnd);
    emit('swiped');
  };
  el.addEventListener('transitionend', onEnd);
  setTimeout(() => {
    el.removeEventListener('transitionend', onEnd);
    emit('swiped');
  }, 350);
}

// Swipe composable — only instantiated when swipeable is true
const { swipeOffset, isSwiping, isDismissing } = props.swipeable
  ? useSwipeToDismiss(cardRef, { onSlideOut: collapseContainer })
  : { swipeOffset: ref(0), isSwiping: ref(false), isDismissing: ref(false) };

// Card transform: only applied while there is actual horizontal offset
const cardStyle = computed(() => {
  if (!props.swipeable || swipeOffset.value === 0) return undefined;
  return {
    transform: `translateX(${swipeOffset.value}px)`,
    // Live drag → no transition. Release → spring back or slide-out
    transition: isSwiping.value
      ? 'none'
      : 'transform 360ms cubic-bezier(0.25, 1, 0.5, 1)',
  };
});

// ─── Collapse / expand transitions (unchanged from original) ──────────────────
const transitionDuration = '350ms';
const transitionEasing = 'cubic-bezier(0.25, 1, 0.5, 1)';

function onEnter(el: Element) {
  const h = el as HTMLElement;
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
  h.style.height = h.scrollHeight + 'px';
  void h.offsetHeight;
  h.style.transition = `height ${transitionDuration} ${transitionEasing}, opacity ${transitionDuration} ${transitionEasing}`;
  h.style.height = '0';
  h.style.opacity = '0';
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
const isDragOver = ref(false);
let dragCounter = 0;

function onDragEnter(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    dragCounter++;
    isDragOver.value = true;
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onDragLeave(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    dragCounter--;
    if (dragCounter === 0) {
      isDragOver.value = false;
    }
  }
}

function onDrop(e: DragEvent) {
  dragCounter = 0;
  isDragOver.value = false;
  if (e.dataTransfer?.files.length) {
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length > 0) {
      emit('files-dropped', files);
    }
  }
}
</script>

<template>
  <!-- Outer wrapper: handles height collapse after dismiss -->
  <div
    ref="containerRef"
    class="relative"
    :class="
      swipeable && (isSwiping || isDismissing || swipeOffset > 0)
        ? 'overflow-x-clip overflow-y-visible rounded-xl z-10'
        : ''
    "
  >
    <!-- Background — only rendered + visible while swiping -->
    <div
      v-if="swipeable && (isSwiping || isDismissing || swipeOffset > 0)"
      class="absolute inset-0 rounded-xl flex items-center pl-3 pointer-events-none"
      :style="
        swipeAction === 'keep'
          ? 'background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)'
          : 'background: linear-gradient(135deg, #e53935 0%, #c62828 100%)'
      "
      aria-hidden="true"
    >
      <ArchiveRestore v-if="swipeAction === 'keep'" :size="24" color="#fff" />
      <Archive v-else :size="24" color="#fff" />
    </div>

    <!-- Card — slides on swipe, otherwise completely unchanged -->
    <div
      ref="cardRef"
      class="relative bg-surface border border-surface-border rounded-xl p-1 shadow-input overflow-visible cursor-default touch-pan-y"
      :class="{
        'transition-[padding,max-height] duration-[300ms] ease-[cubic-bezier(0.78,0,0.22,1)]':
          isCollapsed,
        'border-2 border-transparent': highlighted,
        'border-primary shadow-[0_0_0_2px_var(--color-primary)]': isDragOver,
      }"
      :style="[
        cardStyle,
        highlighted
          ? {
              background:
                'linear-gradient(var(--color-surface), var(--color-surface)) padding-box, var(--background-image-bismuth) border-box',
              border: '2px solid transparent',
            }
          : undefined,
      ]"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div
        v-if="isDragOver"
        class="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl z-50 flex items-center justify-center text-white"
      >
        <div class="flex flex-col items-center gap-2 font-medium text-body">
          <UploadCloud :size="32" />
          <span>Bilder ablegen zum Hochladen</span>
        </div>
      </div>

      <div class="relative flex justify-between items-start gap-2 select-none">
        <div class="flex-1 min-w-0 my-2 ml-2">
          <div class="flex items-center gap-2">
            <slot name="checkbox"></slot>
            <slot name="title">
              <h3
                v-if="title"
                class="!text-title overflow-hidden text-ellipsis whitespace-nowrap !leading-6 !-my-[3px]"
                :title="title"
              >
                {{ title }}
              </h3>
            </slot>
          </div>

          <transition
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @leave="onLeave"
          >
            <div
              v-show="!isCollapsed"
              v-if="$slots.badges"
              class="row-n mt-1 items-center"
              style="overflow: hidden"
            >
              <slot name="badges"></slot>
            </div>
          </transition>
        </div>

        <slot name="actions-pre"></slot>

        <slot name="menu-trigger">
          <BaseTooltip content="More" placement="bottom">
            <button
              v-if="showMenuTrigger"
              type="button"
              class="relative min-h-8 min-w-8 bg-transparent hover:bg-surface-hover flex justify-center items-center rounded-full transition-hover cursor-pointer touch-target"
              @click.stop="(e: MouseEvent) => $emit('menu-click', e)"
            ><Ellipsis :size="18"/></button>
          </BaseTooltip>
        </slot>

        <slot name="menu"></slot>
      </div>

      <transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
        <div v-show="!isCollapsed" class="mx-2 mb-2 opacity-100 overflow-hidden">
          <div
            v-if="$slots.body"
            class="text-on-surface break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
          >
            <slot name="body"></slot>
          </div>
          <slot name="content-after"></slot>
        </div>
      </transition>
    </div>
  </div>
</template>
