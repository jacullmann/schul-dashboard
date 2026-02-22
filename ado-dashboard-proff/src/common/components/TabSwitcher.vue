<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

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

// -- Data --
const itemRefs = ref<(HTMLElement | null)[]>([]);
const navBarRef = ref<HTMLElement | null>(null);
const navBarScrollWidth = ref(0);
const resizeObserver = ref<ResizeObserver | null>(null);

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

// -- Computed Styles (Exakt wie im Hausaufgaben Dashboard) --

// 1. Die Pille (Der weiße Hintergrund, der gleitet)
const pillStyle = computed(() => {
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
  }
};

const selectItem = (index: number) => {
  selectedIndex.value = index;
  emit('change', props.items[index].id);
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
  if (navBarRef.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.value.observe(navBarRef.value);
  }
  setTimeout(updateMetrics, 100);
});

onBeforeUnmount(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
});
</script>

<template>
  <div class="wrapper">
    <nav class="nav-bar" ref="navBarRef">
      <!-- Background Layer (Die graue Schrift) -->
      <div class="nav-layer background-layer">
        <button
            v-for="(item, index) in items"
            :key="`bg-${item.id}`"
            :ref="(el) => { if (el) itemRefs[index] = el as HTMLElement }"
            class="nav-item"
            @click="selectItem(index)"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- Pill Mask -->
      <div class="highlight-pill" :style="pillStyle">
        <!-- Foreground Layer (Die dunkle Schrift, 1:1 Kopie der Liste) -->
        <div class="nav-layer foreground-layer" :style="innerListStyle">
          <button
              v-for="item in items"
              :key="`fg-${item.id}`"
              class="nav-item active-text"
              tabindex="-1"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

.nav-bar {
  position: relative;
  background-color: var(--vlbg); /* Nutzt exakt die Dashboard-Farbe */
  border: 1px solid var(--border2);
  padding: 0;
  border-radius: var(--border-4);
  display: flex;
  isolation: isolate;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  box-shadow: var(--input-shadow);
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
  transition: transform .4s cubic-bezier(0.075, 0.82, 0.165, 1);
}

.highlight-pill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--text);
  border-radius: calc(var(--border-4) - 1px);
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.075, 0.82, 0.165, 1);
}

.nav-item {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 12px;
  font-size: 14px;
  border-radius: var(--border-4);
  color: var(--sub);
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.nav-item:hover {
  color: var(--text);
}

.nav-item.active-text {
  color: var(--lbg); /* Die dunkle Farbe auf der weißen Pille */
}
</style>