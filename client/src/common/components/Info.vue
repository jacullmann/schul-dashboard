<script setup lang="ts">
import { ref } from 'vue'
import { Info } from 'lucide-vue-next'
const props = defineProps<{
  content: string
  title?: string
  tooltip: string
}>()
const isOpen = ref(false)
const togglePop = () => {
  isOpen.value = !isOpen.value
}
const onClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.infodashboard-pop-container') && isOpen.value) {
    isOpen.value = false
  }
}
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

</script>

<template>
  <div class="info-pop-container" :title="props.tooltip">
    <div class="info-icon-wrapper" @click.stop="togglePop">
      <Info :size="16" />
    </div>

    <transition name="pop-fade">
      <div v-if="isOpen" class="info-popover card rlc">
        <h4 v-if="props.title" class="popover-title">{{ props.title }}</h4>
        <div class="popover-content" v-html="props.content"></div>
      </div>
    </transition>
  </div>
</template>

<style scoped>

.info-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--sub);
  transition: color 0.15s ease;
}

.info-icon-wrapper:hover {
  color: var(--text);
}

.info-popover {
  position: absolute;
  margin-top: 4px;
  transform: translateX(-50%) translateY(8px);
  max-width: 350px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 12px;
  z-index: 1000;
  box-shadow: var(--shadow-l);
}

.popover-title {
  font-size: 1em;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.popover-content {
  font-size: 0.9em;
  color: var(--sub);
  line-height: 1.5;
}

.pop-fade-enter-active,
.pop-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pop-fade-enter-from,
.pop-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 500px) {
  .info-popover {
    max-width: 95vw;
    min-width: unset;
  }
}
</style>