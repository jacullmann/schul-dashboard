<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useResizeObserver, useWindowSize } from '@vueuse/core';

interface NavItem {
  id: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    items: NavItem[];
    activeId: string;
  }>(),
  {
    items: () => [],
    activeId: '',
  },
);

const emit = defineEmits<{
  (e: 'change', id: string): void;
}>();

const groupId = `tabs-${Math.random().toString(36).substring(2, 9)}`;

const itemRefs = ref<(HTMLElement | null)[]>([]);
const navBarRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const measureRef = ref<HTMLElement | null>(null);
const resizeTrigger = ref(0);
const isStretched = ref(false);
const navBarWidth = ref(0);

const selectedIndex = ref(
  props.items.findIndex((item) => item.id === props.activeId),
);

const { width: windowWidth } = useWindowSize();

watch(
  () => props.activeId,
  (newId) => {
    const index = props.items.findIndex((item) => item.id === newId);
    if (index !== -1) {
      selectedIndex.value = index;
      void nextTick(() => {
        scrollToActive();
      });
    }
  },
  { immediate: true },
);

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

const inversePillStyle = computed(() => {
  if (resizeTrigger.value < 0)
    return { transform: 'translateX(0px)', width: '0px' };
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return { transform: 'translateX(0px)', width: '0px' };

  return {
    transform: `translateX(${-targetElement.offsetLeft}px)`,
    width: `${navBarWidth.value}px`,
  };
});

const updateMetrics = () => {
  resizeTrigger.value++;
  if (navBarRef.value) {
    navBarWidth.value = navBarRef.value.offsetWidth;
  }
};

const checkStretch = () => {
  if (containerRef.value && measureRef.value) {
    const parentWidth = containerRef.value.clientWidth;
    const naturalWidth = measureRef.value.offsetWidth;
    if (parentWidth > 0) {
      isStretched.value = naturalWidth > parentWidth * 0.5;
    }
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
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }
};

onMounted(() => {
  checkStretch();
  updateMetrics();
  setTimeout(() => {
    checkStretch();
    updateMetrics();
  }, 100);
});

watch(isStretched, () => {
  void nextTick(() => {
    updateMetrics();
  });
});

watch(
  () => props.items,
  () => {
    void nextTick(() => {
      checkStretch();
      updateMetrics();
    });
  },
  { deep: true },
);

watch(windowWidth, () => {
  checkStretch();
  updateMetrics();
});

useResizeObserver(containerRef, () => {
  checkStretch();
  updateMetrics();
});

useResizeObserver(navBarRef, () => {
  checkStretch();
  updateMetrics();
});
</script>

<template>
  <div ref="containerRef" class="flex items-center justify-start w-full">
    <div
      ref="navBarRef"
      class="relative bg-surface border border-ghost-border p-0 rounded-full flex isolation-isolate max-w-full overflow-x-auto overflow-y-hidden scrollbar-hide shadow-input"
      :class="isStretched ? 'w-full' : 'w-max'"
    >
      <!-- Main Labels (z-1) -->
      <div
        class="flex items-center h-full relative z-1"
        :class="isStretched ? 'w-full' : 'w-max'"
        role="radiogroup"
      >
        <label
          v-for="(item, index) in items"
          :key="item.id"
          :ref="
            (el) => {
              if (el) itemRefs[index] = el as HTMLElement;
            }
          "
          class="relative bg-transparent min-h-9 min-w-9 touch-target after:min-w-12 after:min-h-12 items-center flex border-0 cursor-pointer py-2 text-sm/4 font-medium text-on-ghost-muted whitespace-nowrap transition-hover hover:text-on-ghost"
          :class="
            isStretched ? 'grow shrink-0 justify-center px-5' : 'shrink-0 px-5'
          "
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

      <!-- Active Pill Background (z-2) & Text Overlay -->
      <div
        class="absolute top-0 bottom-0 bg-action rounded-full min-h-9 min-w-9 touch-target after:min-w-12 after:min-h-12 z-2 overflow-hidden pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.075,0.82,0.165,1)]"
        :style="pillStyle"
        aria-hidden="true"
      >
        <!-- Stationary Text Overlay (nested to inherit clipping) -->
        <div
          class="absolute top-0 left-0 bottom-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.075,0.82,0.165,1)]"
          :style="inversePillStyle"
        >
          <div
            class="flex items-center h-full"
            :class="isStretched ? 'w-full' : 'w-max'"
          >
            <span
              v-for="item in items"
              :key="`fg-${item.id}`"
              class="relative bg-transparent min-h-9 min-w-9 touch-target after:min-w-12 after:min-h-12 items-center flex border-0 cursor-pointer py-2 text-sm/4 font-medium text-on-action whitespace-nowrap"
              :class="
                isStretched
                  ? 'grow shrink-0 justify-center px-5'
                  : 'shrink-0 px-5'
              "
            >
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Invisible container to measure the natural unstretched width of the tabs -->
    <div
      ref="measureRef"
      style="
        position: absolute;
        left: -9999px;
        top: -9999px;
        pointer-events: none;
        visibility: hidden;
        white-space: nowrap;
      "
      class="flex w-max"
      aria-hidden="true"
    >
      <div
        v-for="item in items"
        :key="`measure-${item.id}`"
        class="px-5 py-2 text-sm/4 font-medium items-center flex"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>
