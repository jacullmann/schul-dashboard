<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
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
    'warn': 'var(--color-warn)',
    'danger': 'var(--color-danger)'
  }
  return map[props.announcement.color as string] || 'var(--text-default)'
})

function close() {
  emit('close')
}
</script>

<template>
  <BaseModal @cancel="close">
    <template #title>
      <span class="popup-title">
        <span class="popup-color-indicator" :style="{ backgroundColor: color }"></span>
        Announcement
      </span>
    </template>
    
    <template #content>
      <div class="popup-content">
        {{ announcement.content }}
      </div>
    </template>

    <template #actions>
      <BaseButton ref="confirmBtnRef" @click="close" variant="action">
        {{ t('global.cookies.banner.action') }}
      </BaseButton>
    </template>
  </BaseModal>
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
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.popup-content {
  padding-block: 10px;
  color: var(--color-on-surface);
  line-height: 1.5;
  font-size: 14px;
}
</style>