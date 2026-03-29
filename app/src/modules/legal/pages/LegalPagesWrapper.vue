<script setup lang="ts">
import {computed} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseTabs from '@/common/components/BaseTabs.vue';

interface NavItem {
  id: string;
  label: string;
  routePath: string;
}

const route = useRoute();
const router = useRouter();

// 1. Definition der Tabs
const tabs: NavItem[] = [
  { id: 'imprint', label: 'Imprint', routePath: 'imprint' },
  { id: 'privacy-policy', label: 'Privacy Policy', routePath: 'privacy-policy' },
  { id: 'terms', label: 'Terms', routePath: 'terms' },
];


const activeTabId = computed(() => {
  if (route.path.endsWith('/imprint')) {
    return 'imprint';
  }
  if (route.path.endsWith('/privacy-policy')) {
    return 'privacy-policy';
  }
  if (route.path.endsWith('/terms')) {
    return 'terms';
  }

  return 'imprint';
});


const handleTabChange = (newId: string) => {
  const selectedTab = tabs.find(tab => tab.id === newId);

  if (selectedTab) {
    router.push({ name: selectedTab.routePath });
  }
};
</script>

<template>
  <div class="card">
    <div class="row" style="margin-bottom:16px;">
      <BaseTabs
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