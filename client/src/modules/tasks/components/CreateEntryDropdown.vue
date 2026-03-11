<template>
  <div class="create-entry-wrapper">
    <button
        class="btn mg action"
        @click="toggleMenu"
        ref="buttonRef"
    >
      <Plus :size="28" />
    </button>

    <div
        v-if="isOpen"
        class="menu"
        :class="{ 'align-right': alignRight }"
        ref="menuRef"
    >
      <button
          class="menu-btn"
          @click="selectType('HAUSAUFGABE')"
      >
        <div class="menu-btn-content">
          <FileText :size="16" />
          {{ t('school.tasks.types.homework') }}
        </div>
      </button>

      <button
          class="menu-btn"
          @click="selectType('DALTON')"
      >
        <div class="menu-btn-content">
          <NotebookText :size="16" />
          {{ t('school.tasks.types.dalton') }}
        </div>
      </button>

      <button
          class="menu-btn"
          @click="selectType('PRUEFUNG')"
      >
        <div class="menu-btn-content">
          <BookOpenText :size="16" />
          {{ t('school.tasks.types.exam') }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { NotebookText, FileText, Lock, BookOpenText, Plus } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

type EntryType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';

const emit = defineEmits<{
  (e: 'select', type: EntryType): void;
}>();

const isOpen = ref(false);
const alignRight = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);

async function toggleMenu() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await nextTick();
    updateMenuPosition();
  }
}

function updateMenuPosition() {
  if (!menuRef.value || !buttonRef.value) return;

  const menu = menuRef.value;
  const button = buttonRef.value;
  const buttonRect = button.getBoundingClientRect();
  const menuWidth = menu.offsetWidth;
  const viewportWidth = window.innerWidth;

  // Check if menu would overflow on the right when left-aligned
  const leftAlignedRight = buttonRect.left + menuWidth;
  // Check if menu would overflow on the left when right-aligned
  const rightAlignedLeft = buttonRect.right - menuWidth;

  // Prefer left-align, but switch to right-align if it would overflow
  if (leftAlignedRight > viewportWidth && rightAlignedLeft >= 0) {
    alignRight.value = true;
  } else {
    alignRight.value = false;
  }
}

function selectType(type: EntryType) {
  isOpen.value = false;
  emit('select', type);
}

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return;

  const target = event.target as HTMLElement;
  const wrapper = target.closest('.create-entry-wrapper');

  if (!wrapper) {
    isOpen.value = false;
  }
}

function handleResize() {
  if (isOpen.value) {
    updateMenuPosition();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.create-entry-wrapper {
  position: relative;
  display: inline-block;
}

.menu {
  margin-top: 8px;
}

.menu.align-right {
  left: auto;
  right: 0;
}

.mg {
  padding: 4px;
}
</style>