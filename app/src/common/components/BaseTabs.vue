<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useResizeObserver } from '@vueuse/core';

interface NavItem {
  id: string;
  label: string;
}

const props = withDefaults(defineProps<{
  items: NavItem[];
  activeId: string;
}>(), {
  items: () => [],
  activeId: ''
});

const emit = defineEmits<{
  (e: 'change', id: string): void
}>();

const groupId = `tabs-${Math.random().toString(36).substring(2, 9)}`;

const itemRefs = ref<(HTMLElement | null)[]>([]);
const navBarRef = ref<HTMLElement | null>(null);
const navBarScrollWidth = ref(0);
const resizeTrigger = ref(0);

const selectedIndex = ref(
    props.items.findIndex(item => item.id === props.activeId)
);

watch(() => props.activeId, (newId) => {
  const index = props.items.findIndex(item => item.id === newId);
  if (index !== -1) {
    selectedIndex.value = index;
    nextTick(() => {
      scrollToActive();
    });
  }
}, { immediate: true });

const pillStyle = computed(() => {
  if (resizeTrigger.value < 0) return { opacity: 0 };
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return { opacity: 0 };

  return {
    width: `${targetElement.offsetWidth}px`,
    transform: `translateX(${targetElement.offsetLeft}px)`,
    opacity: 1,
  };
});

const innerListStyle = computed(() => {
  if (resizeTrigger.value < 0) return {};
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return {};

  return {
    width: `${navBarScrollWidth.value}px`,
    transform: `translateX(-${targetElement.offsetLeft}px)`,
  };
});

const updateMetrics = () => {
  if (navBarRef.value) {
    navBarScrollWidth.value = navBarRef.value.scrollWidth;
    resizeTrigger.value++;
  }
};

const selectItem = (index: number) => {
  const item = props.items[index];
  if (item && item.id !== props.activeId) {
    selectedIndex.value = index;
    emit('change', item.id);
  }
};

const scrollToActive = () => {
  const target = itemRefs.value[selectedIndex.value];
  if (target && navBarRef.value) {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

onMounted(() => {
  updateMetrics();
  setTimeout(updateMetrics, 100);
});

useResizeObserver(navBarRef, () => {
  updateMetrics();
});
</script>

<template>
  <div class="flex items-center justify-start w-full">
    <div class="relative bg-surface border border-surface-border p-0 rounded-full flex isolation-isolate max-w-full overflow-x-auto overflow-y-hidden scrollbar-hide shadow-input" ref="navBarRef">
      <div class="flex items-center h-full w-max relative z-1" role="radiogroup">
        <label
            v-for="(item, index) in items"
            :key="item.id"
            :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
            class="bg-transparent border-0 cursor-pointer px-4 py-2 text-btn leading-4 rounded-full text-on-surface-muted whitespace-nowrap shrink-0 transition-hover hover:text-on-surface"
        >
          <input
              type="radio"
              :name="groupId"
              :value="item.id"
              :checked="activeId === item.id"
              class="sr-only"
              @change="selectItem(index)"
          />
          {{ item.label }}
        </label>
      </div>

      <div class="absolute top-0 left-0 bottom-0 bg-action rounded-full z-2 overflow-hidden pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.075,0.82,0.165,1)]" :style="pillStyle" aria-hidden="true">
        <div class="flex items-center h-full w-max absolute top-0 left-0 pointer-events-none transition-transform duration-350 ease-[cubic-bezier(0.075,0.82,0.165,1)]" :style="innerListStyle">
          <span
              v-for="item in items"
              :key="`fg-${item.id}`"
              class="bg-transparent border-0 cursor-pointer px-4 py-2 text-btn leading-4 rounded-full text-on-action whitespace-nowrap shrink-0 transition-hover"
          >
            {{ item.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>