<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { UsersRound, Search, ArrowUpRight } from '@lucide/vue';
import BaseCommandPalette from '@/common/components/BaseCommandPalette.vue';
import BaseCommandPaletteItem from '@/common/components/BaseCommandPaletteItem.vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { userGroups, activeGroupId, switchActiveGroup } = useAppAuth();

const query = ref('');

const filteredGroups = computed(() => {
  if (!query.value) return userGroups.value;
  const q = query.value.toLowerCase();
  return userGroups.value.filter((g) => g.name.toLowerCase().includes(q));
});

async function onSwitchGroup(id: string) {
  emit('cancel');
  const oldGroupId = activeGroupId.value;
  if (id !== oldGroupId) {
    const res = await switchActiveGroup(id);
    if (res.ok) {
      await userStore.fetchUser();

      if (oldGroupId && route.path.startsWith(`/groups/${oldGroupId}`)) {
        const newPath = route.path.replace(
          `/groups/${oldGroupId}`,
          `/groups/${id}`,
        );
        await router.push(newPath);

        if (route.path === '/home') {
          await router.push(`/groups/${id}/items/all`);
        }
      } else {
        await router.push(`/groups/${id}/items/all`);
      }
    } else {
      console.error('Failed to switch group', res.error);
    }
  }
}

function handleSelect(index: number) {
  const group = filteredGroups.value[index];
  if (group) {
    onSwitchGroup(group.id);
  }
}
</script>

<template>
  <BaseCommandPalette
    v-model="query"
    :item-count="filteredGroups.length"
    :placeholder="t('search.items.switchGroup')"
    :title="t('search.items.switchGroup')"
    :icon="UsersRound"
    id-prefix="group-result-"
    @select="handleSelect"
    @cancel="$emit('cancel')"
  >
    <template #default="{ selectedIndex, setSelectedIndex }">
      <template v-if="filteredGroups.length">
        <BaseCommandPaletteItem
          v-for="(group, index) in filteredGroups"
          :key="group.id"
          :id="'group-result-' + index"
          :active="selectedIndex === index"
          :label="group.name"
          :avatar-text="group.name.charAt(0).toUpperCase()"
          @click="onSwitchGroup(group.id)"
          @mouseenter="setSelectedIndex(index)"
        >
          <span
            v-if="group.hasUnreadContent && group.id !== activeGroupId"
            class="size-2 rounded-full bg-danger shrink-0 mx-2"
          ></span>

          <ArrowUpRight
            v-if="selectedIndex === index"
            :size="14"
            class="shrink-0 text-on-surface-subtle"
          />
        </BaseCommandPaletteItem>
      </template>

      <!-- Empty state -->
      <div
        v-else
        class="px-4 py-10 flex flex-col items-center gap-2 text-center"
      >
        <Search :size="28" class="text-on-surface-subtle mb-1" />
        <p class="text-sub text-on-surface-muted m-0">
          {{ t('global.search.noResults') }}
          <strong class="text-on-surface">„{{ query }}"</strong>
        </p>
      </div>
    </template>
  </BaseCommandPalette>
</template>
