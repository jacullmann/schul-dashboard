<template>
  <div class="locale-wrapper" ref="wrapperRef">
    <button
        class="menu-btn"
        @click="toggleMenu"
        type="button"
        aria-haspopup="true"
        :aria-expanded="isOpen"
    >
      <div class="menu-btn-content">
        <Languages size="16px" />
        <span>Sprache: {{ localeLabels[locale as SupportedLocale] }}</span>
        <ChevronDown size="16px" class="chevron" :class="{ 'chevron-open': isOpen }" />
      </div>
    </button>

    <div
        v-if="isOpen"
        class="dropdown-menu"
    >
      <button
          v-for="option in localeOptions"
          :key="option.val"
          class="dropdown-item"
          :class="{ active: locale === option.val }"
          @click="updateLocale(option.val)"
          type="button"
      >
        <Check v-if="locale === option.val" size="16px" class="check-icon" />
        <span class="spacer" v-else></span>
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Languages, ChevronDown, Check } from 'lucide-vue-next';
import { useLocale } from '@/composables/useLocale';
import type { SupportedLocale } from '@/locales';

const localeOptions: { val: SupportedLocale; label: string }[] = [
  { val: 'de', label: 'Deutsch' },
  { val: 'en', label: 'English' },
];

const localeLabels: Record<SupportedLocale, string> = {
  de: 'Deutsch',
  en: 'English',
};

const { locale, setLocale } = useLocale();

function updateLocale(loc: SupportedLocale) {
  setLocale(loc);
  isOpen.value = false;
}

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return;
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.locale-wrapper {
  position: relative;
  display: inline-block;
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: var(--border-4);
  cursor: pointer;
  font-size: var(--font-size-sub);
  transition: background 0.2s ease;
}

.menu-btn:hover:not(:disabled) {
  background: var(--gg);
}

.menu-btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.menu-btn-content svg {
  flex-shrink: 0;
}

.chevron {
  margin-left: auto;
  transition: transform 0.2s cubic-bezier(.66,0,.34,1);
}

.chevron-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  min-width: 100%;
  margin-top: 4px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1100;
  box-shadow: var(--shadow-s);
  animation: menuFadeIn 160ms ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: var(--border-4);
  cursor: pointer;
  font-size: var(--font-size-sub);
  transition: background 0.2s ease;
  white-space: nowrap;
}

.dropdown-item:hover:not(:disabled) {
  background: var(--gg);
}

.dropdown-item.active {
  font-weight: 600;
}

.check-icon {
  color: var(--text);
  flex-shrink: 0;
}

.spacer {
  width: 16px;
  flex-shrink: 0;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>