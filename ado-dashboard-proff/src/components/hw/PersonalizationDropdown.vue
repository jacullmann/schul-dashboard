<template>
  <div class="personalization-wrapper">
    <button
        class="menu-btn"
        @click="toggleMenu"
        ref="buttonRef"
        :disabled="updating"
    >
      <div class="menu-btn-content">
        <component :is="currentPersonalized ? Filter : FilterX" size="18px" />
        <span>Personalisierung</span>
        <ChevronDown size="16px" class="chevron" :class="{ 'chevron-open': isOpen }" />
      </div>
    </button>

    <div
        v-if="isOpen"
        class="dropdown-menu"
        ref="menuRef"
    >
      <button
          class="dropdown-item"
          :class="{ active: currentPersonalized }"
          @click="setPersonalization(true)"
          :disabled="updating"
      >
        <Check v-if="currentPersonalized" size="16px" class="check-icon" />
        <span class="spacer" v-else></span>
        Personalisiert
      </button>

      <button
          class="dropdown-item"
          :class="{ active: !currentPersonalized }"
          @click="setPersonalization(false)"
          :disabled="updating"
      >
        <Check v-if="!currentPersonalized" size="16px" class="check-icon" />
        <span class="spacer" v-else></span>
        Nicht personalisiert
      </button>
    </div>

    <div v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Filter, FilterX, ChevronDown, Check } from 'lucide-vue-next';
import hw from '../../hwApi';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

const isOpen = ref(false);
const updating = ref(false);
const message = ref('');
const isError = ref(false);

const buttonRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);

const currentPersonalized = computed(() => props.modelValue);

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

async function setPersonalization(value: boolean) {
  if (updating.value || value === currentPersonalized.value) {
    isOpen.value = false;
    return;
  }

  updating.value = true;
  message.value = '';
  isError.value = false;

  try {
    const { data } = await hw.patch('/api/user/personalization', {
      personalized: value
    });

    if (data.ok) {
      emit('update:modelValue', data.personalized);
      emit('change', data.personalized);
      message.value = value ? 'Personalisiert aktiviert' : 'Alle Einträge werden angezeigt';
      isError.value = false;

      setTimeout(() => {
        message.value = '';
      }, 3000);
    }
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Fehler beim Aktualisieren';
    isError.value = true;

    setTimeout(() => {
      message.value = '';
      isError.value = false;
    }, 4000);
  } finally {
    updating.value = false;
    isOpen.value = false;
  }
}

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return;

  const target = event.target as HTMLElement;
  const wrapper = buttonRef.value?.closest('.personalization-wrapper');
  if (wrapper && !wrapper.contains(target)) {
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
.personalization-wrapper {
  position: relative;
  display: inline-block;
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 6px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.menu-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.menu-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  transition: transform 0.2s ease;
}

.chevron-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--jj);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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
  padding: 8px 10px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
  white-space: nowrap;
}

.dropdown-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-item.active {
  font-weight: 600;
}

.check-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.spacer {
  width: 16px;
  flex-shrink: 0;
}

.message {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  background: rgba(63, 147, 248, 0.1);
  color: var(--primary);
  border: 1px solid rgba(63, 147, 248, 0.2);
  animation: messageSlideIn 200ms ease;
  z-index: 1000;
}

.message.error {
  background: rgba(246, 82, 82, 0.1);
  color: #f65252;
  border-color: rgba(246, 82, 82, 0.2);
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

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>