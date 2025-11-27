<template>
  <div class="popup-overlay" @click.self="close">
    <div class="announcement-popup" :style="{ borderLeftColor: color }">
      <div class="popup-header">
        <div class="popup-title">
          <div class="popup-color-indicator" :style="{ backgroundColor: color }"></div>
          <h3>{{ announcement.title }}</h3>
        </div>
        <button class="popup-close" @click="close">×</button>
      </div>
      <div class="popup-content">
        {{ announcement.content }}
      </div>
      <div class="popup-footer">
        <button class="btn" @click="close">Allles Klaro</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  announcement: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const color = computed(() => {
  const map = {
    'info': '#3f93f8',
    'warn': '#f59e0b',
    'danger': '#ef4444'
  }
  return map[props.announcement.color] || '#3f93f8'
})

function close() {
  emit('close')
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.announcement-popup {
  background: var(--card);
  border-radius: 12px;
  padding: 0;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0 20px;
  gap: 12px;
}

.popup-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.popup-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.popup-title h3 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
}

.popup-close {
  background: none;
  border: none;
  color: var(--text);
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.popup-close:hover {
  background: var(--jj);
}

.popup-content {
  padding: 20px;
  color: var(--text);
  line-height: 1.5;
  font-size: 14px;
  border-bottom: 1px solid var(--border);
}

.popup-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
}

.popup-footer .btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.popup-footer .btn:hover {
  opacity: 0.9;
}

@media (max-width: 500px) {
  .popup-overlay {
    padding: 16px;
  }

  .popup-header {
    padding: 16px 16px 0 16px;
  }

  .popup-content {
    padding: 16px;
  }

  .popup-footer {
    padding: 12px 16px;
  }
}
</style>