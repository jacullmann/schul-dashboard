<template>
  <div class="create-entry-wrapper">
    <button
        class="btn mg action"
        @click="toggleMenu"
        ref="buttonRef"
    >
      <Plus size="28px" />
    </button>

    <div
        v-if="isOpen"
        class="entry-menu"
        :class="{ 'align-right': alignRight }"
        ref="menuRef"
    >
      <button
          class="menu-btn"
          @click="selectType('HAUSAUFGABE')"
          data-umami-event="Dropdown - Hausaufgabe erstellen"
      >
        <div class="fixall">
          <FileText :size="16" />
          Hausaufgabe
        </div>
      </button>
      <button
          class="menu-btn"
          @click="selectType('DALTON')"
          data-umami-event="Dropdown - Dalton erstellen"
      >
        <div class="fixall">
          <NotebookText :size="16" />
          Dalton
        </div>
      </button>
      <button
          class="menu-btn"
          @click="selectType('PRUEFUNG')"
          data-umami-event="Dropdown - Prüfung erstellen"
      >
        <div class="fixall">
          <BookOpenText :size="16" />
          Prüfung
        </div>
      </button>
      <div class="last-of-three">

      </div>
      <button
          class="menu-btn"
          @click="selectType('PRIVATE')"
          data-umami-event="Dropdown - Privater Eintrag erstellen"
      >
        <div class="fixall">
          <Lock :size="16" />
          Privater Eintrag
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { NotebookText, FileText, Lock, BookOpenText, Plus } from 'lucide-vue-next';

type EntryType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE';

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

.entry-menu {
  position: absolute;
  left: 0;
  top: 100%;
  min-width: 180px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  z-index: 1000;
  box-shadow: var(--shadow-s);
  animation: menuFadeIn 160ms ease;
  margin-top: 8px;
}

.entry-menu.align-right {
  left: auto;
  right: 0;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.menu-btn .fixall {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.menu-btn .fixall svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.menu-btn:hover {
  background: var(--gg);
}
.mg {
  padding: 4px;

}
.last-of-three {
  border-bottom: 1px solid var(--border2);
}
</style>