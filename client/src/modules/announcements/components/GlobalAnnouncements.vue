<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncements } from '@/modules/announcements/composables/useAnnouncements';
import { X, EllipsisVertical } from 'lucide-vue-next';

const { activeGroupId } = useAppAuth();

const { announcements, colorFor, checkAndNotifyUnread } = useAnnouncements();

const currentIndex = ref<number>(0);
const showMenu = ref<boolean>(false);

const currentAnnouncement = computed(
  () => announcements.value[currentIndex.value] ?? { id: '', content: '', color: 'info' },
);

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function selectAnnouncement(index: number) {
  currentIndex.value = index;
  showMenu.value = false;
}

function nextAnnouncement() {
  if (announcements.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % announcements.value.length;
  }
}

function updateAnnouncementHeight() {
  const height = announcements.value.length && activeGroupId.value ? '45px' : '0px';
  document.documentElement.style.setProperty('--announcement-height', height);
  window.dispatchEvent(new CustomEvent('announcement-height-changed'));
}

// Update layout height whenever the announcement list changes
watch(announcements, updateAnnouncementHeight);

// On group change: reload announcements and check for unseen ones
watch(activeGroupId, async (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    currentIndex.value = 0;
    showMenu.value = false;
    await checkAndNotifyUnread();
  } else if (!newVal) {
    announcements.value = [];
    updateAnnouncementHeight();
  }
});

onMounted(async () => {
  if (activeGroupId.value) {
    await checkAndNotifyUnread();
  }
  updateAnnouncementHeight();
});
</script>

<template>
  <div class="blurit" v-if="showMenu" @click="showMenu = false">
    <div class="announcement-menu" @click.stop>
      <div class="announcement-menu-header">
        <h3>Alle Ankündigungen</h3>
        <button class="close-btn" @click="showMenu = false">
          <X :size="20" />
        </button>
      </div>
      <div class="announcement-list">
        <div
          v-for="(ann, index) in announcements"
          :key="ann.id"
          class="announcement-item"
          :class="{ active: index === currentIndex }"
          @click="selectAnnouncement(index)"
        >
          <div class="announcement-item-color" :class="colorFor(ann.color)"></div>
          <div class="announcement-item-content">
            <span>{{ ann.content }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="global-announcements" v-if="announcements.length">
    <div
      class="global-ann"
      :class="colorFor(currentAnnouncement.color)"
    >
      <div class="global-ann-content" @click="nextAnnouncement">
        <span class="announcement-text">{{ currentAnnouncement.content }}</span>
        <span class="announcement-counter" v-if="announcements.length > 1">
          ({{ currentIndex + 1 }}/{{ announcements.length }})
        </span>
      </div>

      <button class="announcement-menu-btn" @click.stop="toggleMenu">
        <EllipsisVertical :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.global-announcements {
  position: fixed;
  top: var(--header-height);
  left: 0;
  width: 100%;
  z-index: 1000;
}

.global-ann {
  padding: 8px 12px;
  color: var(--color-on-surface);
  font-size: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-menu);
  border-bottom: 1px solid var(--color-surface-border);
}

.global-ann-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  overflow: hidden;
}

.announcement-text {
  white-space: normal;
  flex: 1;
  text-align: center;
}

.announcement-counter {
  font-size: 12px;
  opacity: 0.8;
  flex-shrink: 0;
}

.announcement-menu-btn {
  background: none;
  border: none;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 12px;
}

.announcement-menu-btn:hover {
  color: var(--color-on-surface);
}

.announcement-menu {
  background: var(--color-canvas);
  border: 1px solid var(--color-canvas-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-menu);
}

.announcement-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
}

.announcement-menu-header h3 {
  margin: 0;
  font-size: var(--text-h3);
  color: var(--color-on-surface);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-on-surface);
  cursor: pointer;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  margin: -6px;
}

.close-btn:hover {
  background: var(--color-surface);
}

.announcement-list {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.announcement-item {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 12px;
  box-shadow: var(--shadow-input);
}

.announcement-item:hover {
  background: var(--color-surface-hover);
}

.announcement-item.active {
  background: var(--color-action);
  border-color: var(--color-action);
  color: var(--color-on-action);
}

.announcement-item-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.announcement-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.announcement-item-content span {
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-info, .is-default {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

.is-warn {
  background-color: var(--color-warn);
  color: var(--color-on-warn);
}

.is-danger {
  background-color: var(--color-danger);
  color: var(--color-on-danger);
}

@media (max-width: 500px) {
  .global-ann-content {
    gap: 4px;
  }

  .announcement-text {
    font-size: 13px;
  }
}
</style>
