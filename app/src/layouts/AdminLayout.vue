<script setup lang="ts">
import { computed, type Component } from 'vue';
import SidebarButton from '@/core/components/SidebarButton.vue';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: Component;
  count?: number;
  danger?: boolean;
  description?: string;
}

const props = defineProps<{
  navItems: AdminNavItem[];
  activeTab: string;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', value: string): void;
}>();

const activeTab = computed({
  get: () => props.activeTab,
  set: (v) => emit('update:activeTab', v),
});
</script>

<template>
  <div class="adm-layout">
    <div class="adm-body">
      <aside
        class="adm-sidebar p-3.5 w-60 shrink-0 bg-surface border-r border-ghost-border overflow-y-auto hidden md:flex flex-col gap-3.5 scrollbar-hide"
      >
        <nav class="flex flex-col w-full">
          <SidebarButton
            v-for="item in navItems"
            :key="item.id"
            :label="item.label"
            :active="activeTab === item.id"
            :icon="item.icon"
            @click="activeTab = item.id"
          >
            <span
              v-if="item.count && item.count > 0"
              class="adm-nav-badge"
              :class="{ danger: item.danger }"
            >
              {{ item.count }}
            </span>
          </SidebarButton>
        </nav>
      </aside>

      <main class="adm-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.adm-layout {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - var(--header-height));
  background: var(--color-canvas);
  color: var(--color-on-ghost);
}

.adm-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.adm-sidebar {
  position: sticky;
  top: var(--header-height);
  align-self: flex-start;
  height: calc(100dvh - var(--header-height));
  z-index: 100;
}

.adm-nav-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  background: var(--color-surface-hover);
  color: var(--color-on-ghost-muted);
}

.adm-nav-badge.danger {
  background: var(--color-danger-hover);
  color: var(--color-danger);
}

.adm-main {
  flex: 1;
  padding: 28px 32px 64px;
  min-width: 0;
}

@media (max-width: 767px) {
  .adm-main {
    padding: 20px 16px 48px;
  }
}
</style>
