<script setup lang="ts">
import { computed, type Component } from 'vue';
import SidebarButton from '@/core/components/SidebarButton.vue';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: Component;
  count?: number;
  danger?: boolean;
}

const props = defineProps<{
  title: string;
  subtitle?: string | null;
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
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="adm-header">
      <div class="adm-header-inner">
        <div class="adm-header-left">
          <div class="adm-header-titles">
            <h1 class="adm-title">{{ title }}</h1>
            <span v-if="subtitle" class="adm-subtitle">{{ subtitle }}</span>
          </div>
        </div>
        <!-- Slot for optional header-right content (e.g. action buttons). -->
        <div class="adm-header-right">
          <slot name="header-right" />
        </div>
      </div>
    </header>

    <div class="adm-body">
      <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
      <aside
        class="adm-sidebar p-3.5 w-full md:w-60 shrink-0 bg-surface border-b md:border-b-0 md:border-r border-surface-border overflow-x-auto md:overflow-y-auto flex md:flex-col gap-3.5 scrollbar-hide"
      >
        <nav class="flex flex-row md:flex-col w-full">
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

      <!-- ── Main content ─────────────────────────────────────────────────── -->
      <main class="adm-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ─── Layout ────────────────────────────────────────────────────────────────── */
.adm-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-canvas);
  color: var(--color-on-ghost);
}

/* ─── Header ────────────────────────────────────────────────────────────────── */
.adm-header {
  height: 56px;
  border-bottom: 1px solid var(--color-canvas-border);
  background: var(--color-canvas);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 200;
}

.adm-header-inner {
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.adm-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.adm-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.adm-header-titles {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.adm-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
}

.adm-subtitle {
  font-size: var(--text-sm);
  color: var(--color-on-ghost-muted);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Body ──────────────────────────────────────────────────────────────────── */
.adm-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ─── Sidebar ───────────────────────────────────────────────────────────────── */
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

/* ─── Main content ──────────────────────────────────────────────────────────── */
.adm-main {
  flex: 1;
  padding: 28px 32px 64px;
  overflow-y: auto;
  min-width: 0;
}

/* ─── Responsive ────────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .adm-body {
    flex-direction: column;
  }

  .adm-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-canvas-border);
    padding: 8px;
    overflow-x: auto;
    overflow-y: visible;
  }

  .adm-nav-badge {
    display: none;
  }

  .adm-main {
    padding: 20px 16px 48px;
  }
}

@media (max-width: 480px) {
  .adm-header-inner {
    padding: 0 12px;
  }
}
</style>
