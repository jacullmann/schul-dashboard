<script setup lang="ts">
import { ref } from 'vue'
import { Info, X } from 'lucide-vue-next'

const props = defineProps<{
  title?: string
  tooltip: string
}>()

const isModalOpen = ref(false)

const openModal = () => (isModalOpen.value = true)
const closeModal = () => (isModalOpen.value = false)

const handleBackgroundClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.classList.contains('blurit')) {
    closeModal()
  }
}
</script>


<template>
  <div class="info-pop-container" :title="props.tooltip">
    <div class="info-icon-wrapper" @click="openModal">
      <Info size="16px" />
    </div>
  </div>

  <Teleport to="body">
    <Transition name="fade-scale">
      <div v-if="isModalOpen" class="blurit" @click="handleBackgroundClick">
        <div class="card info-modal-content">
          <div class="modal-header">
            <h3 v-if="props.title" class="popover-title">{{ props.title }}</h3>
            <div v-else></div>

            <button
                class="close-btn"
                @click="closeModal"
                aria-label="Modal schließen"
            >
              <X size="20" />
            </button>
          </div>

          <div class="popover-content" >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.info-pop-container {
  display: flex;
  align-items: center;
}

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
.info-modal-content {
  max-width: 640px;
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  background: var(--lbg);
  color: var(--text);
  border: 1px solid var(--border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.popover-title {
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.popover-content {
  font-size: 0.95em;
  color: var(--text);
  line-height: 1.6;
  max-height: 70vh;
  overflow: scroll;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text);
}
@media (max-width: 540px) {
  .info-modal-content {
    max-width: 90vw;
    margin: 16px;
    border-radius: 8px;
  }
}
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: 0.2s ;
  opacity: 1;
  transform: scale(1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
}

.fade-scale-enter-active .info-modal-content,
.fade-scale-leave-active .info-modal-content {
  transition: all 0.2s ease-out;
}

.fade-scale-enter-from .info-modal-content,
.fade-scale-leave-to .info-modal-content {
  transform: scale(0);
}
</style>