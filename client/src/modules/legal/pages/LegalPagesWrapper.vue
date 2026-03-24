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
  { id: 'impress', label: 'Impress', routePath: 'impress' },
  { id: 'privacy-policy', label: 'Privacy Policy', routePath: 'privacy-policy' },
  { id: 'terms', label: 'Terms', routePath: 'terms' },
];


const activeTabId = computed(() => {
  if (route.path.endsWith('/impress')) {
    return 'impress';
  }
  if (route.path.endsWith('/privacy-policy')) {
    return 'privacy-policy';
  }
  if (route.path.endsWith('/terms')) {
    return 'terms';
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