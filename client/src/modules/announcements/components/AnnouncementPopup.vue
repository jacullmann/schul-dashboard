<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import Modal from '@/common/components/Modal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  announcement: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const confirmBtnRef = ref<HTMLButtonElement | null>(null)

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  setTimeout(() => {
    confirmBtnRef.value?.focus()
  }, 50)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

const color = computed(() => {
  const map: Record<string, string> = {
    'info': 'var(--text-default)',
    'warn': 'var(--warn)',
    'danger': 'var(--danger)'
  }
  return map[props.announcement.color as string] || 'var(--text-default)'
})

function close() {
  emit('close')
}
</script>

<template>
  <Modal @cancel="close">
    <template #title>
      <span class="popup-title">
        <span class="popup-color-indicator" :style="{ backgroundColor: color }"></span>
        Ankündigung
      </span>
    </template>
    
    <template #content>
      <div class="popup-content">
        {{ announcement.content }}
      </div>
    </template>

    <template #actions>
      <button 
        ref="confirmBtnRef" 
        class="btn action"
        @click="close"
      >
        {{ t('global.cookies.banner.action') }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.popup-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.popup-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: var(--border-radius-full);
  flex-shrink: 0;
}

.popup-content {
  padding-block: 10px;
  color: var(--text-default);
  line-height: 1.5;
  font-size: 14px;
}
</style>