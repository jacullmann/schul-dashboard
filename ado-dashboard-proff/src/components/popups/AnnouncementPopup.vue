<template>
  <div class="announcement-popup-overlay" @click.self="close">
    <div class="announcement-popup" :style="{ borderLeftColor: colorFor(announcement.color) }">
      <div class="popup-header">
        <div class="popup-title-section">
          <div class="popup-badge" :style="{ backgroundColor: colorFor(announcement.color) }">
            {{ getBadgeText(announcement.color) }}
          </div>
          <h3 class="popup-title">{{ announcement.title }}</h3>
        </div>
        <button class="popup-close-btn" @click="close">×</button>
      </div>

      <div class="popup-content">
        <p>{{ announcement.content }}</p>
      </div>

      <div class="popup-footer">
        <button class="btn btn-ghost" @click="close">Schliesen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  announcement: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}

function colorFor(color) {
  const map = {
    'info': '#3f93f8',
    'warn': '#f59e0b',
    'danger': '#ef4444',
    'ok': '#10b981'
  }
  return map[color] || '#3f93f8'
}

function getBadgeText(color) {
  const map = {
    'info': 'Info',
    'warn': 'Wichtig',
    'danger': 'Dringend',
    'ok': 'Info'
  }
  return map[color] || 'Info'
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.announcement-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.announcement-popup {
  background: var(--card);
  border-radius: 12px;
  border-left: 4px solid;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0 20px;
  gap: 12px;
}

.popup-title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popup-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  align-self: flex-start;
}

.popup-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}

.popup-close-btn {
  background: none;
  border: none;
  color: var(--text);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.popup-close-btn:hover {
  opacity: 1;
}

.popup-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.popup-content p {
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 20px 20px;
  border-top: 1px solid var(--border);
  gap: 12px;
}

.popup-footer small {
  opacity: 0.7;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .announcement-popup-overlay {
    padding: 16px;
  }

  .popup-header {
    padding: 16px 16px 0 16px;
  }

  .popup-content {
    padding: 16px;
  }

  .popup-footer {
    padding: 12px 16px 16px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .popup-footer small {
    text-align: center;
  }
}
</style>