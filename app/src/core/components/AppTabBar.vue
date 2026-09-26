<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useElementSize } from '@vueuse/core';
import { House, ListTodo, CalendarDays, MessageCircle } from '@lucide/vue';
import type { NavItem } from '@/common/components/BaseTabs.vue';
import { useIsOnScreenKeyboardOpen } from '@/common/composables/useViewport';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const isKeyboardOpen = useIsOnScreenKeyboardOpen();

/** Each tab's id is the name of the route it opens. */
const tabs = computed<NavItem[]>(() => [
  { id: 'group-dashboard', label: t('common.sidebar.dashboard'), icon: House },
  { id: 'group-tasks', label: t('common.sidebar.tasks'), icon: ListTodo },
  {
    id: 'group-schedule',
    label: t('common.sidebar.schedule'),
    icon: CalendarDays,
  },
  {
    id: 'group-messages',
    label: t('common.tab_bar.chat'),
    icon: MessageCircle,
  },
]);

/** The tab being navigated to, shown as selected until the navigation settles. */
const pendingTab = ref<string | null>(null);

const routeTab = computed(
  () => tabs.value.find((tab) => tab.id === route.name)?.id ?? null,
);
const activeTab = computed(() => pendingTab.value ?? routeTab.value);

async function openTab(name: string) {
  pendingTab.value = name;
  try {
    // Named navigation keeps the current :groupId.
    await router.push({ name });
  } finally {
    // A blocked or failed navigation hands the selection back to the route,
    // unless a later tap has already claimed it.
    if (pendingTab.value === name) pendingTab.value = null;
  }
}

const barEl = ref<HTMLElement | null>(null);
const { height } = useElementSize(
  barEl,
  { width: 0, height: 0 },
  { box: 'border-box' },
);

// Pages pad their bottom by this, so nothing ends up permanently behind the
// bar. Measured rather than derived from tokens: the bar's height depends on
// the device's safe area and the user's font size.
watchEffect(() => {
  document.documentElement.style.setProperty(
    '--tab-bar-height',
    `${height.value}px`,
  );
});

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty('--tab-bar-height');
});
</script>

<template>
  <!-- The nav spans the full width for the safe-area math, but only the bar
       itself takes pointer events, so the margin around it stays tappable. -->
  <nav
    v-if="routeTab"
    v-show="!isKeyboardOpen"
    ref="barEl"
    :aria-label="t('common.tab_bar.label')"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-tab-bar) flex justify-center pt-2 pr-[max(--spacing(4),env(safe-area-inset-right))] pb-[max(--spacing(2),env(safe-area-inset-bottom))] pl-[max(--spacing(4),env(safe-area-inset-left))] md:hidden print:hidden"
  >
    <BaseTabs
      class="pointer-events-auto max-w-md"
      variant="tab-bar"
      :items="tabs"
      :active-id="activeTab ?? ''"
      @change="openTab"
    />
  </nav>
</template>
