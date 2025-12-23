<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

// -- Types --
interface NavItem {
  id: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE';
  label: string;
}

// -- Props --
const props = withDefaults(defineProps<{
  activeTab?: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE'
}>(), {
  activeTab: 'HAUSAUFGABE'
});

// -- Emits --
const emit = defineEmits<{
  (e: 'change', tab: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE'): void
}>();

// -- Data --
const items: NavItem[] = [
  { id: 'HAUSAUFGABE', label: 'Hausaufgaben' },
  { id: 'DALTON', label: 'Dalton' },
  { id: 'PRUEFUNG', label: 'Prüfungen' },
  { id: 'PRIVATE', label: 'Privat' },
];

const itemRefs = ref<(HTMLElement | null)[]>([]);
const navBarRef = ref<HTMLElement | null>(null);
const navBarScrollWidth = ref(0);
const resizeObserver = ref<ResizeObserver | null>(null);

// Find index based on activeTab
const selectedIndex = ref(
    items.findIndex(item => item.id === props.activeTab)
);

// Watch for external tab changes
watch(() => props.activeTab, (newTab) => {
  const index = items.findIndex(item => item.id === newTab);
  if (index !== -1) {
    selectedIndex.value = index;
    nextTick(() => {
      scrollToActive();
    });
  }
});

// -- Computed Styles --

// 1. The Pill Geometry
const pillStyle = computed(() => {
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return { opacity: 0 };

  return {
    width: `${targetElement.offsetWidth}px`,
    transform: `translateX(${targetElement.offsetLeft}px)`,
    opacity: 1,
  };
});

// 2. The Inner List Geometry
const innerListStyle = computed(() => {
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return {};

  return {
    width: `${navBarScrollWidth.value}px`, // Matches the full SCROLL width
    transform: `translateX(-${targetElement.offsetLeft}px)`, // Inverse movement
  };
});

// -- Methods --
const updateMetrics = () => {
  if (navBarRef.value) {
    // We use scrollWidth to capture the full width of content, not just visible area
    navBarScrollWidth.value = navBarRef.value.scrollWidth;
  }
};

const selectItem = (index: number) => {
  selectedIndex.value = index;
  emit('change', items[index].id);
};

const scrollToActive = () => {
  const target = itemRefs.value[selectedIndex.value];
  if (target && navBarRef.value) {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

// -- Lifecycle --
onMounted(() => {
  // Initial calculation
  updateMetrics();

  // Observer for responsive resizing
  if (navBarRef.value) {
    resizeObserver.value = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.value.observe(navBarRef.value);
  }

  // Update on font load or delayed rendering
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

      <div class="nav-layer background-layer">
        <button
            v-for="(item, index) in items"
            :key="`bg-${item.id}`"
            ref="itemRefs"
            class="nav-item"
            @click="selectItem(index)"
            :data-umami-event="`Dashboard ${item.label} Reiter`"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="highlight-pill" :style="pillStyle">

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
/* -- Reset -- */
* {
  box-sizing: border-box;
}

/* -- Wrapper -- */
.wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

/* -- The Bar Container -- */
.nav-bar {
  position: relative;
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  padding: 0;
  border-radius: var(--border-4);
  display: flex;
  isolation: isolate;
  /* Scroll behavior */
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Hide Scrollbar for Chrome/Safari */
.nav-bar::-webkit-scrollbar {
  display: none;
}

/* -- Shared Layer Styles -- */
.nav-layer {
  display: flex;
  align-items: center;
  height: 100%;
  /* Ensure layers don't wrap or shrink */
  width: max-content;
}

/* Background Layer: Static, holds the clickable buttons */
.background-layer {
  position: relative;
  z-index: 1;
}

/* Foreground Layer: Inside the pill, holds the black text */
.foreground-layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  /* Transition must match pill transition to look 'locked' */
  transition: transform .4s cubic-bezier(0.075, 0.82, 0.165, 1);
}

/* -- The Sliding Pill (Mask) -- */
.highlight-pill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: var(--text);
  border-radius: var(--border-4);
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.075, 0.82, 0.165, 1);
}

/* -- The Buttons -- */
.nav-item {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 12px;
  font-size: 14px;
  border-radius: var(--border-4);
  color: var(--sub);
  white-space: nowrap; /* Prevent text wrapping */
  flex-shrink: 0; /* Prevent items from squishing */
  transition: color 0.2s ease;
}

.nav-item:hover {
  color: var(--text);
}

/* -- The Text Inside the Pill -- */
.nav-item.active-text {
  color: var(--lbg);
}
</style>