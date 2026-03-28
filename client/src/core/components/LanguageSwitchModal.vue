<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Languages, Search, Check } from '@lucide/vue';
import { usePreferences } from '@/common/composables/usePreferences';
import BaseCommandPalette from '@/common/components/BaseCommandPalette.vue';
import BaseCommandPaletteItem from '@/common/components/BaseCommandPaletteItem.vue';

const emit = defineEmits<{ (e: 'cancel'): void }>();

const { t } = useI18n();
const { currentLanguage, setPreference } = usePreferences();

const query = ref('');

const allOptions = [
  { id: 'de', label: 'Deutsch', icon: Languages },
  { id: 'en', label: 'English', icon: Languages },
];

const filteredOptions = computed(() => {
  if (!query.value) return allOptions;
  const q = query.value.toLowerCase();
  return allOptions.filter((o) => o.label.toLowerCase().includes(q));
});

function onSwitchLanguage(id: string) {
  setPreference('language', id);
  emit('cancel');
}

function handleSelect(index: number) {
  const opt = filteredOptions.value[index];
  if (opt) {
    onSwitchLanguage(opt.id);
  }
}
</script>

<template>
  <BaseCommandPalette
    v-model="query"
    :item-count="filteredOptions.length"
    :placeholder="t('search.descriptions.changeLanguage')"
    :title="t('account.menu.language.title')"
    :icon="Languages"
    id-prefix="language-result-"
    @select="handleSelect"
    @cancel="$emit('cancel')"
  >
    <template #default="{ selectedIndex, setSelectedIndex }">
      <template v-if="filteredOptions.length">
        <BaseCommandPaletteItem
          v-for="(opt, index) in filteredOptions"
          :key="opt.id"
          :id="'language-result-' + index"
          :active="selectedIndex === index"
          :label="opt.label"
          :icon="opt.icon"
          @click="onSwitchLanguage(opt.id)"
          @mouseenter="setSelectedIndex(index)"
        >
          <Check
            v-if="currentLanguage === opt.id"
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
