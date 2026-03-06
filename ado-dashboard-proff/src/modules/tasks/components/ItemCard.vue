<template>
  <!-- Outer wrapper: handles height collapse after dismiss -->
  <div ref="containerRef" class="swipe-container" :class="{ 'swipe-active': swipeable && (isSwiping || isDismissing || swipeOffset > 0) }">

    <!-- Red background — only rendered + visible while swiping -->
    <div v-if="swipeable && (isSwiping || isDismissing || swipeOffset > 0)" class="swipe-background" aria-hidden="true">
      <Archive :size="24" color="#fff" />
    </div>

    <!-- Card — slides on swipe, otherwise completely unchanged -->
    <div
        ref="cardRef"
        class="item-card"
        :class="{ collapsed: isCollapsed, highlighted: highlighted }"
        :style="cardStyle"
    >
      <div class="item-main">
        <div class="item-meta">
          <div style="display:flex; align-items:center; gap:8px;">
            <slot name="checkbox"></slot>
            <slot name="title">
              <h3 v-if="title" class="item-title" :title="title">{{ title }}</h3>
            </slot>
          </div>

          <transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
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

      <transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
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
import { Ellipsis, Archive } from 'lucide-vue-next';
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
const containerRef = ref<HTMLElement | null>(null);

// Smooth height-collapse of the entire row after the card has slid off screen
function collapseContainer() {
  const el = containerRef.value;
  if (!el) { emit('swiped'); return; }

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
  setTimeout(() => { el.removeEventListener('transitionend', onEnd); emit('swiped'); }, 350);
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
    transition: isSwiping.value ? 'none' : 'transform 360ms cubic-bezier(0.25, 1, 0.5, 1)',
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
</script>

<style scoped>
/* Container: transparent by default — no clipping so dropdown menus are not cut off */
.swipe-container {
  position: relative;
}

/* Only clip while a swipe gesture is in progress */
.swipe-container.swipe-active {
  overflow: hidden;
  border-radius: var(--border-7);
}

/* Red background shown only while swiping */
.swipe-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  border-radius: var(--border-7);
  display: flex;
  align-items: center;
  padding-left: 24px;
  pointer-events: none;
}

/* ─── item-card: identical to original when swipe is idle ─────────────────── */
.item-card {
  position: relative;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-7);
  padding: 12px;
  box-shadow: var(--input-shadow);
  overflow: visible;
  cursor: default;
  touch-action: pan-y;
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