<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncements } from '@/modules/announcements/composables/useAnnouncements';
import AnnouncementPopup from '@/modules/announcements/components/AnnouncementPopup.vue';
import { X, EllipsisVertical } from 'lucide-vue-next';

const { activeGroupId } = useAppAuth();

const {
  announcements,
  isPopupRead,
  markPopupAsRead,
  loadReadStatus,
  colorFor,
} = useAnnouncements();

const currentIndex = ref<number>(0);
const showMenu = ref<boolean>(false);
const showPopup = ref<boolean>(false);
const currentPopupAnnouncement = ref<typeof announcements.value[number] | null>(null);

const hasGroupContext = computed(() => !!activeGroupId.value);

const currentAnnouncement = computed(() => {
  return announcements.value[currentIndex.value] ?? { id: '', content: '', color: 'info', showAsPopup: false };
});

/** After announcements and read-status are loaded, show the first unseen popup. */
function checkForNewPopups() {
  for (const ann of announcements.value) {
    if (ann.showAsPopup && !isPopupRead(ann.id)) {
      currentPopupAnnouncement.value = ann;
      showPopup.value = true;
      markPopupAsRead(ann.id);
      break;
    }
  }
}

function closePopup() {
  showPopup.value = false;
  currentPopupAnnouncement.value = null;
}

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
  if (announcements.value.length && hasGroupContext.value) {
    document.documentElement.style.setProperty('--announcement-height', '45px');
  } else {
    document.documentElement.style.setProperty('--announcement-height', '0px');
  }
  window.dispatchEvent(new CustomEvent('announcement-height-changed'));
}

// Watch for both announcements and readPopupIds to be ready before checking popups
watch(announcements, (newAnnouncements) => {
  if (newAnnouncements.length) {
    updateAnnouncementHeight();
    checkForNewPopups();
  } else {
    updateAnnouncementHeight();
  }
});

// Reload when active group changes
watch(activeGroupId, (newVal) => {
  if (newVal) {
    currentIndex.value = 0;
    closePopup();
  } else {
    announcements.value = [];
    updateAnnouncementHeight();
  }
});

onMounted(async () => {
  await loadReadStatus();
  updateAnnouncementHeight();
});
</script>

<template>
  <div class="blurit" v-if="showMenu" @click="showMenu = false">
    <div class="announcement-menu" @click.stop>
      <div class="announcement-menu-header">
        <h3>All Announcements</h3>
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
          <div class="announcement-item-color" :style="{ backgroundColor: colorFor(ann.color) }"></div>
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
        :style="{ backgroundColor: colorFor(currentAnnouncement.color) }"
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

  <AnnouncementPopup
      v-if="showPopup && currentPopupAnnouncement"
      :announcement="currentPopupAnnouncement"
      @close="closePopup"
  />
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
  color: var(--color-sub);
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
  background: var(--color-on-surface);
  border-color: var(--color-on-surface);
  color: var(--color-canvas);
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

@media (max-width: 500px) {
  .global-ann {
    padding: 8px 12px;
  }

  .global-ann-content {
    gap: 4px;
  }

  .announcement-text {
    font-size: 13px;
  }
}
</style>
