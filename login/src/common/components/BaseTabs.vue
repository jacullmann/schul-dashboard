<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useResizeObserver } from '@vueuse/core';

// -- Types --
interface NavItem {
  id: string;
  label: string;
}

// -- Props --
const props = withDefaults(defineProps<{
  items: NavItem[];
  activeId: string;
}>(), {
  items: () => [],
  activeId: ''
});

// -- Emits --
const emit = defineEmits<{
  (e: 'change', id: string): void
}>();

// Group radios by unique ID to allow multiple BaseTabs instances on one page
const groupId = `tabs-${Math.random().toString(36).substring(2, 9)}`;

// -- Data --
const itemRefs = ref<(HTMLElement | null)[]>([]);
const navBarRef = ref<HTMLElement | null>(null);
const navBarScrollWidth = ref(0);
const resizeTrigger = ref(0); // Forcing reactive recalculations on container resize

// Find index based on activeId
const selectedIndex = ref(
    props.items.findIndex(item => item.id === props.activeId)
);

// Watch for external tab changes
watch(() => props.activeId, (newId) => {
  const index = props.items.findIndex(item => item.id === newId);
  if (index !== -1) {
    selectedIndex.value = index;
    nextTick(() => {
      scrollToActive();
    });
  }
}, { immediate: true });

// -- Computed Styles (Exakt wie im Aufgaben Dashboard) --

// 1. Die Pille (Der weiße Hintergrund, der gleitet)
const pillStyle = computed(() => {
  if (resizeTrigger.value < 0) return { opacity: 0 }; // Track resize
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return { opacity: 0 };

  return {
    width: `${targetElement.offsetWidth}px`,
    transform: `translateX(${targetElement.offsetLeft}px)`,
    opacity: 1,
  };
});

// 2. Die innere Liste (Invertierter Text, der gegenläufig gleitet)
const innerListStyle = computed(() => {
  if (resizeTrigger.value < 0) return {}; // Track resize
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return {};

  return {
    width: `${navBarScrollWidth.value}px`,
    transform: `translateX(-${targetElement.offsetLeft}px)`,
  };
});

// -- Methods --
const updateMetrics = () => {
  if (navBarRef.value) {
    navBarScrollWidth.value = navBarRef.value.scrollWidth;
    resizeTrigger.value++; // Force style recalculation on resize
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

// -- Lifecycle --
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
    <div class="nav-bar" ref="navBarRef">
      <!-- Hidden Radio Inputs for Logic & Accessibility -->
      <div class="nav-layer background-layer" role="radiogroup">
        <label
            v-for="(item, index) in items"
            :key="item.id"
            :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
            class="nav-item"
            :class="{ 'active': activeId === item.id }"
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

      <!-- Mask Layer (Pill Animation) -->
      <div class="highlight-pill" :style="pillStyle" aria-hidden="true">
        <!-- Text duplication for the inverted color mask effect -->
        <div class="nav-layer foreground-layer" :style="innerListStyle">
          <span
              v-for="item in items"
              :key="`fg-${item.id}`"
              class="nav-item active-text"
          >
            {{ item.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-bar {
  position: relative;
  background-color: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  padding: 0;
  border-radius: var(--radius-md);
  display: flex;
  isolation: isolate;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  box-shadow: var(--shadow-input);
}

.nav-bar::-webkit-scrollbar {
  display: none;
}

.nav-layer {
  display: flex;
  align-items: center;
  height: 100%;
  width: max-content;
}

.background-layer {
  position: relative;
  z-index: 1;
}

.foreground-layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  transition: transform 350ms cubic-bezier(0.075, 0.82, 0.165, 1);
}

.highlight-pill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--color-action);
  border-radius: calc(var(--radius-md) - 1px);
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  transition: all 350ms cubic-bezier(0.075, 0.82, 0.165, 1);
}

.nav-item {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  font-size: var(--text-btn);
  line-height: 1rem;
  border-radius: var(--radius-md);
  color: var(--color-on-surface-muted);
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.1s;
}

.nav-item:hover {
  color: var(--color-on-surface);
}

.nav-item.active-text {
  color: var(--color-on-action);
}

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
