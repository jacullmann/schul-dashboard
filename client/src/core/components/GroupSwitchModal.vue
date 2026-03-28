<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { UsersRound, Search, ArrowUpRight } from '@lucide/vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { userGroups, activeGroupId, switchActiveGroup } = useAppAuth();

const query = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const selectedIndex = ref(0);

const filteredGroups = computed(() => {
  if (!query.value) return userGroups.value;
  const q = query.value.toLowerCase();
  return userGroups.value.filter(g => g.name.toLowerCase().includes(q));
});

watch(filteredGroups, () => {
  selectedIndex.value = 0;
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

function selectIndex(idx: number) {
  selectedIndex.value = idx;
}

function activateSelected() {
  const group = filteredGroups.value[selectedIndex.value];
  if (group) {
    onSwitchGroup(group.id);
  }
}

async function scrollToSelected() {
  await nextTick();
  const el = document.getElementById(`group-result-${selectedIndex.value}`);
  if (el) {
    el.scrollIntoView({ 
      behavior: 'auto', 
      block: 'nearest' 
    });
  }
}

function handleKeydown(e: KeyboardEvent) {
  const len = filteredGroups.value.length;
  if (!len) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % len;
    scrollToSelected();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + len) % len;
    scrollToSelected();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    activateSelected();
  }
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 50);
});
</script>

<template>
  <div
    class="blurit"
    @click.self="$emit('cancel')"
    aria-hidden="true"
    style="z-index: 100002"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="t('search.items.switchGroup')"
      class="group-switch-modal bg-surface border border-surface-border rounded-2xl w-[calc(100%-32px)] max-w-[560px] overflow-hidden fixed text-left"
      style="
        z-index: 100003;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      @keydown="handleKeydown"
    >
      <!-- Search input -->
      <div class="flex items-center gap-3 p-4 border-b border-surface-border">
        <UsersRound :size="20" class="text-on-surface-subtle shrink-0" />
        <input
          id="group-switch-modal-input"
          ref="inputRef"
          v-model="query"
          type="text"
          :placeholder="t('search.items.switchGroup')"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 p-0 rounded-none bg-transparent border-none outline-none text-on-surface text-body placeholder:text-on-surface-subtle"
        />
        <BaseKbd class="hidden sm:inline-flex">Esc</BaseKbd>
      </div>

      <!-- Results -->
      <div class="max-h-[420px] overflow-y-auto py-2">
        <template v-if="filteredGroups.length">
          <button
            :id="'group-result-' + index"
            v-for="(group, index) in filteredGroups"
            :key="group.id"
            class="search-result-item w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none text-left transition-colors"
            :class="
              selectedIndex === index
                ? 'bg-surface-hover'
                : 'bg-transparent hover:bg-surface-hover-subtle'
            "
            @click="onSwitchGroup(group.id)"
            @mouseenter="selectIndex(index)"
          >
            <span
              class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-surface-hover text-on-surface-muted"
            >
              {{ group.name.charAt(0).toUpperCase() }}
            </span>

            <span class="flex-1 min-w-0">
              <span
                class="block text-sub font-medium text-on-surface leading-tight"
                >{{ group.name }}</span
              >
            </span>
            
            <span
              v-if="group.hasUnreadContent && group.id !== activeGroupId"
              class="size-2 rounded-full bg-danger shrink-0 mx-2"
            ></span>

            <ArrowUpRight
              v-if="selectedIndex === index"
              :size="14"
              class="shrink-0 text-on-surface-subtle"
            />
          </button>
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
      </div>

      <!-- Footer hint -->
      <div
        class="px-4 py-2.5 border-t border-surface-border flex items-center gap-4 text-footnote text-on-surface-muted"
      >
        <span class="flex items-center gap-1">
          <BaseKbd>↑</BaseKbd>
          <BaseKbd>↓</BaseKbd>
          {{ t('search.modal.hintNavigate') }}
        </span>
        <span class="flex items-center gap-1">
          <BaseKbd>↵</BaseKbd>
          {{ t('search.modal.hintConfirm') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-switch-modal {
  /* Smooth appear animation */
  animation: search-in 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes search-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 8px)) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Custom scrollbar */
.max-h-\[420px\]::-webkit-scrollbar {
  width: 4px;
}

.max-h-\[420px\]::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-\[420px\]::-webkit-scrollbar-thumb {
  background: var(--color-surface-border);
  border-radius: 999px;
}
</style>
