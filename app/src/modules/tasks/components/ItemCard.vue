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
    reducedBottomMargin?: boolean;
  }>(),
  {
    isCollapsed: false,
    highlighted: false,
    showMenuTrigger: true,
    swipeable: false,
    swipeAction: 'archive',
    reducedBottomMargin: false,
  },
);

const emit = defineEmits<{
  (e: 'menu-click', event: MouseEvent): void;
  (e: 'swiped'): void;
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

const { swipeOffset, isSwiping, isDismissing } = props.swipeable
  ? useSwipeToDismiss(cardRef, { onSlideOut: collapseContainer })
  : { swipeOffset: ref(0), isSwiping: ref(false), isDismissing: ref(false) };

const cardStyle = computed(() => {
  if (!props.swipeable || swipeOffset.value === 0) return undefined;
  return {
    transform: `translateX(${swipeOffset.value}px)`,
    transition: isSwiping.value
      ? 'none'
      : 'transform 360ms cubic-bezier(0.25, 1, 0.5, 1)',
  };
});

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
    class="relative"
    :class="
      swipeable && (isSwiping || isDismissing || swipeOffset > 0)
        ? 'overflow-x-clip overflow-y-visible rounded-xl z-10'
        : 'z-20 focus-within:z-30 hover:z-30 has-[[role=menu]]:z-50'
    "
  >
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
        <div class="flex flex-col items-center gap-2 font-medium text-base">
          <UploadCloud :size="32" />
          <span>Bilder ablegen zum Hochladen</span>
        </div>
      </div>

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
              <BaseRow class="mt-1">
                <slot name="badges"></slot>
              </BaseRow>
            </div>
          </Transition>
        </div>

        <slot name="actions-pre"></slot>

        <slot name="menu-trigger">
          <BaseTooltip v-if="showMenuTrigger" content="More" placement="bottom">
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
    </div>
  </div>
</template>
