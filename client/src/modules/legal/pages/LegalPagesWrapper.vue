<script setup lang="ts">
import {computed, onMounted} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TabSwitcher from '@/common/components/TabSwitcher.vue';

interface NavItem {
  id: string;
  label: string;
  routePath: string;
}

const route = useRoute();
const router = useRouter();

// 1. Definition der Tabs
const tabs: NavItem[] = [
  { id: 'impressum', label: 'Impressum', routePath: 'impressum' },
  { id: 'datenschutz', label: 'Datenschutz', routePath: 'datenschutz' },
  { id: 'nutzung', label: 'Nutzungsbedingungen', routePath: 'nutzung' },
];


const activeTabId = computed(() => {
  if (route.path.endsWith('/impressum')) {
    return 'impressum';
  }
  if (route.path.endsWith('/datenschutz')) {
    return 'datenschutz';
  }
  if (route.path.endsWith('/nutzung')) {
    return 'nutzung';
  }

  if (route.path.endsWith('/legal/')) {
    return 'impressum';
  }
  return '';
});


const handleTabChange = (newId: string) => {
  const selectedTab = tabs.find(tab => tab.id === newId);

  if (selectedTab) {
    router.push(selectedTab.routePath);
  }
};

onMounted(() => {
  handleTabChange(route.path);
})
</script>

<template>
  <div class="card">
    <div class="row" style="margin-bottom:16px;">
      <TabSwitcher
          :items="tabs"
          :active-id="activeTabId"
          @change="handleTabChange"
      />
    </div>
    <router-view />
  </div>
</template>

<style scoped>
</style>