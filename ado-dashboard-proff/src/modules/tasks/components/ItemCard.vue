<template>
  <div
      class="item-card"
      :class="{ collapsed: isCollapsed, highlighted: highlighted }"
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
</template>

<script setup lang="ts">
import { Ellipsis } from 'lucide-vue-next';

withDefaults(defineProps<{
  title?: string;
  isCollapsed?: boolean;
  highlighted?: boolean;
  showMenuTrigger?: boolean;
}>(), {
  isCollapsed: false,
  highlighted: false,
  showMenuTrigger: true,
});

defineEmits<{
  (e: 'menu-click', event: MouseEvent): void;
}>();

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
.item-card {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-7);
  padding: 12px;
  box-shadow: var(--input-shadow);
  overflow: visible;
  cursor: default;
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