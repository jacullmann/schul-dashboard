<template>
  <div class="global-announcements" v-if="announcements.length && !isWelcomePage">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
    </div>

    <!-- NEU: Menu Overlay -->
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
            <div class="announcement-item-color" :style="{ backgroundColor: colorFor(ann.color) }"></div>
            <div class="announcement-item-content">
              <span>{{ ann.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- NEU: Popup Components -->
  <AnnouncementPopup
      v-if="showPopup && currentPopupAnnouncement"
      :announcement="currentPopupAnnouncement"
      @close="closePopup"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import hw from '@/api/hwApi';
import AnnouncementPopup from '@/modules/announcements/components/AnnouncementPopup.vue';
import { X } from 'lucide-vue-next';

const announcements = ref([]);
const currentIndex = ref(0);
const showMenu = ref(false);
const showPopup = ref(false);
const currentPopupAnnouncement = ref(null);
const route = useRoute();
const welcomePaths = ['/welcome', '/admin-dashboard', '/kanye', '/verify'];
const isWelcomePage = computed(() =>
    welcomePaths.some(path => route.path.startsWith(path))
);

const currentAnnouncement = computed(() => {
  return announcements.value[currentIndex.value] || {};
});

const getSeenPopups = () => {
  try {
    return JSON.parse(localStorage.getItem('seenAnnouncementPopups') || '[]');
  } catch {
    return [];
  }
};

const markPopupAsSeen = (announcementId) => {
  const seen = getSeenPopups();
  if (!seen.includes(announcementId)) {
    seen.push(announcementId);
    localStorage.setItem('seenAnnouncementPopups', JSON.stringify(seen));
  }
};

onMounted(async () => {
  if (!isWelcomePage.value) {
    try {
      const { data } = await hw.get('/api/announcements');
      announcements.value = data;
      updateAnnouncementHeight();
      checkForNewPopups(data);
    } catch (error) {
      console.error('Fehler beim Laden der globalen Ankündigungen', error);
    }
  }
});

function checkForNewPopups(announcements) {
  const seenPopups = getSeenPopups();

  for (const announcement of announcements) {
    if (announcement.showAsPopup && !seenPopups.includes(announcement._id)) {
      currentPopupAnnouncement.value = announcement;
      showPopup.value = true;
      markPopupAsSeen(announcement._id);
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

function selectAnnouncement(index) {
  currentIndex.value = index;
  showMenu.value = false;
}

function nextAnnouncement() {
  if (announcements.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % announcements.value.length;
  }
}

function updateAnnouncementHeight() {
  if (announcements.value.length && !isWelcomePage.value) {
    document.documentElement.style.setProperty('--announcement-height', '45px');
  } else {
    document.documentElement.style.setProperty('--announcement-height', '0px');
  }
  window.dispatchEvent(new CustomEvent('announcement-height-changed'));
}

watch(announcements, () => {
  updateAnnouncementHeight();
});

watch(isWelcomePage, () => {
  updateAnnouncementHeight();
});

watch(isWelcomePage, async (newValue, oldValue) => {
  if (oldValue === true && newValue === false) {
    try {
      const { data } = await hw.get('/api/announcements');
      announcements.value = data;
      updateAnnouncementHeight();
      checkForNewPopups(data);
    } catch (error) {
      console.error('Fehler beim Laden der globalen Ankündigungen', error);
    }
  }
}, { immediate: false });

function colorFor(color) {
  const map = {
    'ok': 'var(--primary)',
    'warn': 'var(--warn)',
    'danger': 'var(--danger)',
    'expired': 'var(--gg)',
    'info': 'var(--vlbg)',
  };
  return map[color] || 'var(--sub)';
}
</script>

<style scoped>
.global-announcements {
  position: fixed;
  top: var(--header-height);
  left: 0;
  width: 100%;
  z-index: 1000;
}

.global-ann {
  padding: 10px 12px;
  color: var(--text);
  font-size: var(--font-size-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--menu-shadow);
  border-bottom: 1px solid var(--border2);
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

/* NEU: Menu Button Styles */
.announcement-menu-btn {
  background: none;
  border: none;
  color: var(--sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 12px;
}

.announcement-menu-btn:hover {
  color: var(--text);
}

.announcement-menu {
  background: var(--lbg);
  border: 1px solid var(--border);
  border-radius: var(--border-7);
  padding: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--menu-shadow);
}

.announcement-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
}

.announcement-menu-header h3 {
  margin: 0;
  font-size: var(--font-size-h3);
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-4);
  margin: -6px;
}

.close-btn:hover {
  background: var(--vlbg);
}

.announcement-list {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.announcement-item {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: var(--border-4);
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 12px;
  box-shadow: var(--input-shadow)
}

.announcement-item:hover {
  background: var(--gg);
}

.announcement-item.active {
  background: var(--text);
  border-color: var(--text);
  color: var(--bg);
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

.announcement-item-content strong {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
    padding: 10px 12px;
  }

  .global-ann-content {
    gap: 4px;
  }

  .announcement-text {
    font-size: 13px;
  }
}
</style>