<template>
  <div
      class="swipe-container"
      :class="{ dismissing: isDismissing }"
  >
    <!-- Red background layer revealed on swipe -->
    <div v-if="swipeable" class="swipe-background">
      <div class="swipe-background-icon" :style="{ opacity: backgroundIconOpacity }">
        <Check :size="28" :stroke-width="2.5" />
      </div>
    </div>

    <!-- Card content layer -->
    <div
        ref="cardRef"
        class="item-card"
        :class="{ collapsed: isCollapsed, highlighted: highlighted }"
        :style="cardSwipeStyle"
    >
      <div class="item-main">
        <div class="item-meta">
          <div style="display:flex; align-items:center; gap:8px;">
            <slot name="checkbox"></slot>
            <slot name="title">
              <h3 v-if="title" class="item-title" :title="title">{{ title }}</h3>
            </slot>
          </div>

          <transition
              @enter="onEnter"
              @after-enter="onAfterEnter"
              @leave="onLeave"
          >
            <div v-show="!isCollapsed" v-if="$slots.badges" class="row-n item-badges" style="overflow: hidden;">
              <slot name="badges"></slot>
            </div>
          </transition>
        </div>

        <slot name="actions-pre"></slot>

        <slot name="menu-trigger">
          <div
              v-if="showMenuTrigger"
              class="item-menu-trigger"
              role="button"
              tabindex="0"
              @click.stop="(e) => $emit('menu-click', e)"
          >
            <slot name="menu-icon">
              <Ellipsis :size="18" />
            </slot>
          </div>
        </slot>

        <slot name="menu"></slot>
      </div>

      <transition
          @enter="onEnter"
          @after-enter="onAfterEnter"
          @leave="onLeave"
      >
        <div v-show="!isCollapsed" class="item-collapsible-wrapper" style="overflow: hidden;">
          <div v-if="$slots.body" class="item-body">
            <slot name="body"></slot>
          </div>
          <slot name="content-after"></slot>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Ellipsis, Check } from 'lucide-vue-next';
import { useSwipeToDismiss } from '@/modules/tasks/composables/useSwipeToDismiss';

const props = withDefaults(defineProps<{
  title?: string;
  isCollapsed?: boolean;
  highlighted?: boolean;
  showMenuTrigger?: boolean;
  swipeable?: boolean;
}>(), {
  isCollapsed: false,
  highlighted: false,
  showMenuTrigger: true,
  swipeable: false,
});

const emit = defineEmits<{
  (e: 'menu-click', event: MouseEvent): void;
  (e: 'swiped'): void;
}>();

const cardRef = ref<HTMLElement | null>(null);

// Swipe setup
const { swipeOffset, isSwiping, isDismissing } = props.swipeable
  ? useSwipeToDismiss(cardRef, { onDismiss: () => emit('swiped') })
  : { swipeOffset: ref(0), isSwiping: ref(false), isDismissing: ref(false) };

const cardSwipeStyle = computed(() => {
  if (!props.swipeable || swipeOffset.value === 0) return undefined;
  return {
    transform: `translateX(${swipeOffset.value}px)`,
    transition: isSwiping.value ? 'none' : 'transform 350ms cubic-bezier(0.25, 1, 0.5, 1)',
  };
});

const backgroundIconOpacity = computed(() => {
  if (!props.swipeable) return 0;
  const width = cardRef.value?.offsetWidth ?? 300;
  // Fade in progressively as the card is swiped
  return Math.min(1, swipeOffset.value / (width * 0.2));
});

// Collapse / expand transition logic
const transitionDuration = '350ms';
const transitionEasing = 'cubic-bezier(0.25, 1, 0.5, 1)'; // Super smooth out-quart

function onEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '0';
  htmlEl.style.opacity = '0';
  void htmlEl.offsetHeight; // trigger reflow

  htmlEl.style.transition = `height ${transitionDuration} ${transitionEasing}, opacity ${transitionDuration} ${transitionEasing}`;
  htmlEl.style.height = htmlEl.scrollHeight + 'px';
  htmlEl.style.opacity = '1';
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
  htmlEl.style.transition = '';
}

function onLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = htmlEl.scrollHeight + 'px';
  void htmlEl.offsetHeight; // trigger reflow

  htmlEl.style.transition = `height ${transitionDuration} ${transitionEasing}, opacity ${transitionDuration} ${transitionEasing}`;
  htmlEl.style.height = '0';
  htmlEl.style.opacity = '0';
}
</script>

<style scoped>
.swipe-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--border-7);
}

.swipe-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  border-radius: var(--border-7);
  display: flex;
  align-items: center;
  padding-left: 24px;
  pointer-events: none;
  z-index: 0;
}

.swipe-background-icon {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  transition: opacity 80ms ease;
}

.item-card {
  position: relative;
  z-index: 1;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-7);
  padding: 12px;
  box-shadow: var(--input-shadow);
  overflow: visible;
  cursor: default;
  touch-action: pan-y;
  will-change: transform;
}
.item-card.collapsed {
  transition:
      padding 300ms cubic-bezier(0.78, 0, 0.22, 1),
      max-height 300ms cubic-bezier(0.78, 0, 0.22, 1);
}
.item-card.highlighted {
  border: 2px solid transparent;
  background:
      linear-gradient(var(--vlbg), var(--vlbg)),
      linear-gradient(125deg, #FFA91A 0%, #FF335A 38%, #AF00FF 75%, #5600FF 110%);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
}

.item-main {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  user-select: none;
  -webkit-user-select: none;
}

.item-meta {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: -3px 0;
  font-size: var(--font-size-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 24px;
}

.item-badges {
  margin-top: 4px;
  gap: 8px;
  align-items: center;
}

.item-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: var(--border-5);
  cursor: pointer;
  color: var(--sub);
  transition: background 120ms ease, color 120ms ease;
  margin: -8px;
}

.item-menu-trigger:hover {
  background: var(--gg);
  color: var(--text);
}

.item-body {
  margin-top: 8px;
  color: var(--text);
  word-break: break-word;
  overflow-wrap: anywhere;
  hyphens: auto;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.item-collapsible-wrapper {
  opacity: 1;
}
</style>