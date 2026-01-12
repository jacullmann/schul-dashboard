<template>
  <aside
      class="sidebar"
      :class="{ 'sidebar-expanded': isExpanded }"
      @mouseenter="isExpanded = true"
      @mouseleave="isExpanded = false"
  >
    <nav class="sidebar-nav">
      <button
          v-for="tab in navItems"
          :key="tab.key"
          @click="$emit('update:activeTab', tab.key)"
          :class="{ active: activeTab === tab.key }"
          class="nav-item"
      >
        <component :is="tab.icon" :size="18" class="nav-icon" />
        <span class="nav-text">{{ tab.label }}</span>
        <span v-if="tab.counter > 0" class="counter" :class="{ danger: tab.key === 'reports' }">
          {{ tab.counter }}
        </span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  LayoutDashboard,
  Users,
  Flag,
  Inbox,
  ShieldAlert,
  Megaphone,
  CalendarDays
} from 'lucide-vue-next';

const props = defineProps<{
  activeTab: string;
  reportsCount: number;
  sorgenCount: number;
}>();

defineEmits(['update:activeTab']);

const isExpanded = ref(false);

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  counter: number;
}

const navItems = ref<NavItem[]>([
  { key: 'overview', label: 'Übersicht', icon: LayoutDashboard, counter: 0 },
  { key: 'timetable', label: 'Stundenplan', icon: CalendarDays, counter: 0 },
  { key: 'announcements', label: 'Ankündigungen', icon: Megaphone, counter: 0 },
  { key: 'users', label: 'Benutzer', icon: Users, counter: 0 },
  { key: 'reports', label: 'Meldungen', icon: Flag, counter: props.reportsCount },
  { key: 'sorgen', label: 'Sorgenbox', icon: Inbox, counter: props.sorgenCount },
  { key: 'security', label: 'Sicherheit', icon: ShieldAlert, counter: 0 },
]);

watch(() => props.reportsCount, (newCount) => {
  const reportItem = navItems.value.find(item => item.key === 'reports');
  if (reportItem) reportItem.counter = newCount;
});

watch(() => props.sorgenCount, (newCount) => {
  const sorgenItem = navItems.value.find(item => item.key === 'sorgen');
  if (sorgenItem) sorgenItem.counter = newCount;
});
</script>

<style scoped>

.sidebar {
  position: fixed;
  top: var(--admin-header-height);
  left: 0;
  height: calc(100vh - var(--admin-header-height));
  background: var(--lbg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 999;
  transition: width 0.2s ease;
  overflow: hidden;
  width: 60px;
}

.sidebar-expanded {
  width: 220px;
}
.sidebar-header h2 { margin: 0; font-size: 1.2rem; white-space: nowrap;}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  margin-top: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px;
  margin: 0 10px;
  border-radius: 6px;
  background: transparent;
  color: var(--sub);
  text-align: left;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}
.nav-item:hover {
  background: var(--opacity--hover);
  color: var(--text);
}

.nav-item.active {
  background: var(--ghost--hover);
  color: var(--text);
  font-weight: 500;
}

.nav-text, .counter {
  opacity: 0;
}

.sidebar-expanded .nav-text,
.sidebar-expanded .counter {
  opacity: 1;
}

.nav-icon {
  flex-shrink: 0;
}

.counter {
  margin-left: auto;
  background: var(--gg);
  color: var(--text);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
}
.counter.danger { background: var(--danger); }

@media (max-width: 1024px) {
  .sidebar {
    position: static;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 0;
  }
  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 10px 20px;
    flex-wrap: nowrap;
  }

  .nav-item {
    margin: 0;
    padding: 8px 12px;
    flex-shrink: 0;
    justify-content: center;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
  }
  .nav-text { opacity: 1; }
  .counter { display: none; }
}
</style>