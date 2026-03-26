<script setup lang="ts">
import { ref, computed } from 'vue';
import { NotebookText, FileText, BookOpenText, Plus } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { onClickOutside, useElementBounding, useWindowSize } from '@vueuse/core';

const { t } = useI18n();

type EntryType = 'homework' | 'dalton' | 'exam';

const emit = defineEmits<{
  (e: 'select', type: EntryType): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);

const { left: btnLeft } = useElementBounding(buttonRef);
const { width: windowWidth } = useWindowSize();

// Switch to right-align when the button is close enough to the right viewport edge
// that a 180px+ wide menu would overflow (min-w-[180px] + buffer)
const alignRight = computed(() => btnLeft.value + 200 > windowWidth.value);

onClickOutside(containerRef, () => {
  isOpen.value = false;
});

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function selectType(type: EntryType) {
  isOpen.value = false;
  emit('select', type);
}
</script>

<template>
  <div ref="containerRef" class="relative inline-flex">
    <BaseButton class="px-1 py-1" @click="toggleMenu" ref="buttonRef" variant="action">
      <Plus :size="24" />
    </BaseButton>

    <BaseMenu
        v-if="isOpen"
        class="mt-2"
        :class="{ 'left-auto right-0': alignRight }"
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
