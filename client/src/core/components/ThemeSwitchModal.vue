<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SunMoon, Moon, Sun, Search, Check } from '@lucide/vue';
import { usePreferences } from '@/common/composables/usePreferences';
import BaseCommandPalette from '@/common/components/BaseCommandPalette.vue';
import BaseCommandPaletteItem from '@/common/components/BaseCommandPaletteItem.vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const { currentTheme, setPreference } = usePreferences();

const query = ref('');

const allOptions = computed(() => [
  { id: 'system', label: t('global.theme.system'), icon: SunMoon },
  { id: 'dark', label: t('global.theme.dark'), icon: Moon },
  { id: 'light', label: t('global.theme.light'), icon: Sun },
]);

const filteredOptions = computed(() => {
  if (!query.value) return allOptions.value;
  const q = query.value.toLowerCase();
  return allOptions.value.filter((o) => o.label.toLowerCase().includes(q));
});

function onSwitchTheme(id: string) {
  setPreference('theme', id);
  emit('cancel');
}

function handleSelect(index: number) {
  const opt = filteredOptions.value[index];
  if (opt) {
    onSwitchTheme(opt.id);
  }
}
</script>

<template>
  <BaseCommandPalette
    v-model="query"
    :item-count="filteredOptions.length"
    :placeholder="t('search.descriptions.changeTheme')"
    :title="t('account.menu.theme.title')"
    :icon="SunMoon"
    id-prefix="theme-result-"
    @select="handleSelect"
    @cancel="$emit('cancel')"
  >
    <template #default="{ selectedIndex, setSelectedIndex }">
      <template v-if="filteredOptions.length">
        <BaseCommandPaletteItem
          v-for="(opt, index) in filteredOptions"
          :key="opt.id"
          :id="'theme-result-' + index"
          :active="selectedIndex === index"
          :label="opt.label"
          :icon="opt.icon"
          @click="onSwitchTheme(opt.id)"
          @mouseenter="setSelectedIndex(index)"
        >
          <Check
            v-if="currentTheme === opt.id"
            :size="16"
            class="shrink-0 text-on-surface"
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
