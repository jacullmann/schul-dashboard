<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { NotebookText, FileText, BookOpenText, Plus } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import type BaseMenu from '@/common/components/BaseMenu.vue';

const { t } = useI18n();

type EntryType = 'homework' | 'dalton' | 'exam';

const emit = defineEmits<{
  (e: 'select', type: EntryType): void;
}>();

const isOpen = ref(false);
const alignRight = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<InstanceType<typeof BaseMenu> | null>(null);

async function toggleMenu() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await nextTick();
    updateMenuPosition();
  }
}

function updateMenuPosition() {
  if (!menuRef.value || !buttonRef.value) return;

  const menu = menuRef.value.el.value as HTMLElement;
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

<template>
  <div class="relative inline-flex">
    <BaseButton class="px-1 py-1" @click="toggleMenu" ref="buttonRef" variant="action">
      <Plus :size="24" />
    </BaseButton>

    <BaseMenu
        v-if="isOpen"
        class="mt-2"
        :class="{ 'left-auto right-0': alignRight }"
        ref="menuRef"
    >
      <BaseMenuButton @click="selectType('homework')">
        <FileText :size="16" />
        {{ t('school.tasks.types.homework') }}
      </BaseMenuButton>

      <BaseMenuButton @click="selectType('dalton')">
        <NotebookText :size="16" />
        {{ t('school.tasks.types.dalton') }}
      </BaseMenuButton>

      <BaseMenuButton @click="selectType('exam')">
        <BookOpenText :size="16" />
        {{ t('school.tasks.types.exam') }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
</template>
