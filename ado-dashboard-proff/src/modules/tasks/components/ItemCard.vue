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

        <div v-if="$slots.badges" class="row-n item-badges" :class="{ collapsed: isCollapsed }">
          <slot name="badges"></slot>
        </div>
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

    <transition name="collapse">
      <div v-show="!isCollapsed" v-if="$slots.body" class="item-body">
        <slot name="body"></slot>
      </div>
    </transition>

    <slot name="content-after"></slot>
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
</script>

<style scoped>
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

.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 300ms cubic-bezier(0.78, 0, 0.22, 1),
  opacity 300ms cubic-bezier(0.78, 0, 0.22, 1),
  padding 300ms cubic-bezier(0.78, 0, 0.22, 1);
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 800px;
  opacity: 1;
}
</style>