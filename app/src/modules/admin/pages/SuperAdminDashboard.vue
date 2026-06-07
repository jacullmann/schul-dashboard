<script setup lang="ts">
import { computed, onMounted, markRaw, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LayoutDashboard, Users, Flag, Layers } from '@lucide/vue';
import SuperAdminLayout from '@/layouts/AdminLayout.vue';
import { useSuperAdminStats } from '../composables/useSuperAdminStats';
import type { SuperAdminNavItem } from '../types';

const route = useRoute();
const router = useRouter();
const { stats, loadStats } = useSuperAdminStats();

const navItems = computed<(SuperAdminNavItem & { icon: Component })[]>(() => [
  {
    id: 'overview',
    name: 'super-admin',
    label: 'Overview',
    icon: markRaw(LayoutDashboard),
    count: 0,
  },
  {
    id: 'users',
    name: 'admin-users',
    label: 'Users',
    icon: markRaw(Users),
    count: 0,
  },
  {
    id: 'reports',
    name: 'admin-reports',
    label: 'Reports',
    icon: markRaw(Flag),
    count: stats.value?.reportCount ?? 0,
    danger: true,
  },
  {
    id: 'groups',
    name: 'admin-groups',
    label: 'Groups',
    icon: markRaw(Layers),
    count: 0,
  },
]);

const activeTab = computed(
    () => navItems.value.find((i) => i.name === route.name)?.id ?? 'overview',
);

function onTabChange(id: string) {
  const item = navItems.value.find((i) => i.id === id);
  if (item && item.name !== route.name) router.push({ name: item.name });
}

onMounted(loadStats);
</script>

<template>
  <SuperAdminLayout
      title="Super Admin"
      :nav-items="navItems"
      :active-tab="activeTab"
      @update:active-tab="onTabChange"
  >
    <router-view />
  </SuperAdminLayout>
</template>
