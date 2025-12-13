<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';

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
const navBarWidth = ref(0);

// Finde den Index basierend auf activeTab
const selectedIndex = ref(
    items.findIndex(item => item.id === props.activeTab)
);

// Watch für externe Tab-Änderungen (z.B. durch Route)
watch(() => props.activeTab, (newTab) => {
  const index = items.findIndex(item => item.id === newTab);
  if (index !== -1) {
    selectedIndex.value = index;
  }
});

// -- Computed Styles --

// 1. The Pill Geometry (Moves to the selected item)
const pillStyle = computed(() => {
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return { opacity: 0 };

  return {
    width: `${targetElement.offsetWidth}px`,
    transform: `translateX(${targetElement.offsetLeft}px)`,
    opacity: 1,
  };
});

// 2. The Inner List Geometry (Moves opposite to the pill to appear stationary)
const innerListStyle = computed(() => {
  const targetElement = itemRefs.value[selectedIndex.value];
  if (!targetElement) return {};

  return {
    width: `${navBarWidth.value}px`, // Must match total width of parent
    transform: `translateX(-${targetElement.offsetLeft}px)`, // Inverse movement
  };
});

// -- Methods --
const selectItem = (index: number) => {
  selectedIndex.value = index;
  emit('change', items[index].id);
};

// -- Lifecycle --
onMounted(() => {
  nextTick(() => {
    // Capture the total width of the nav bar to ensure inner list aligns
    if (navBarRef.value) {
      navBarWidth.value = navBarRef.value.offsetWidth;
    }
  });
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
  background-color: #282828;
  border: 1px solid #414141;
  padding: 0;
  border-radius: 6px;
  display: flex;
  isolation: isolate;
  min-height: 40px;
  width: fit-content;
}

/* -- Shared Layer Styles -- */
.nav-layer {
  display: flex;
  align-items: center;
  height: 100%;
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
  pointer-events: none; /* Let clicks pass through to background */
  transition: transform 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
}

/* -- The Sliding Pill (Mask) -- */
.highlight-pill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: #F1F1F1;
  border-radius: 6px;
  z-index: 2;
  overflow: hidden; /* This acts as the mask/cutout */
  pointer-events: none; /* Let clicks pass through to background buttons */
  transition: all 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
}

/* -- The Buttons -- */
.nav-item {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  /* Default Color (Background Layer) */
  color: #AAA;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.nav-item:hover {
  color: #f1f1f1;
}

/* -- The Text Inside the Pill -- */
.nav-item.active-text {
  color: #0F0F0F; /* Black text strictly inside the pill */
}

/* -- Mobile Responsive -- */
@media (max-width: 500px) {
  .nav-bar {
    width: 100%;
  }

  .nav-item {
    flex: 1;
    text-align: center;
    padding: 10px 8px;
    font-size: 13px;
  }
}
</style>