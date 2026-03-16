<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '@/api/hwApi';
import AnnouncementPopup from '@/modules/announcements/components/AnnouncementPopup.vue';
import { X, EllipsisVertical } from 'lucide-vue-next';

const { activeGroupId } = useAppAuth();
const route = useRoute();

const announcements = ref([]);
const currentIndex = ref(0);
const showMenu = ref(false);
const showPopup = ref(false);
const currentPopupAnnouncement = ref(null);

// This component is only rendered when inside a group route (parent handles v-if),
// but we double-check that we have a group context before loading
const hasGroupContext = computed(() => {
  return !!activeGroupId.value && route.matched.some(r => r.path.includes('/groups/:groupId'));
});

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

async function loadAnnouncements() {
  if (!hasGroupContext.value) {
    announcements.value = [];
    updateAnnouncementHeight();
    return;
  }
  try {
    const { data } = await hw.get('/api/timetable/announcements');
    announcements.value = data;
    updateAnnouncementHeight();
    checkForNewPopups(data);
  } catch (error) {
    console.error('Fehler beim Laden der Ankündigungen', error);
  }
}

function checkForNewPopups(anns) {
  const seenPopups = getSeenPopups();
  for (const announcement of anns) {
    if (announcement.showAsPopup && !seenPopups.includes(announcement.id)) {
      currentPopupAnnouncement.value = announcement;
      showPopup.value = true;
      markPopupAsSeen(announcement.id);
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
  if (announcements.value.length && hasGroupContext.value) {
    document.documentElement.style.setProperty('--announcement-height', '45px');
  } else {
    document.documentElement.style.setProperty('--announcement-height', '0px');
  }
  window.dispatchEvent(new CustomEvent('announcement-height-changed'));
}

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

// Reload announcements when group context changes
watch(hasGroupContext, (newVal) => {
  if (newVal) {
    loadAnnouncements();
  } else {
    announcements.value = [];
    updateAnnouncementHeight();
  }
});

onMounted(() => {
  loadAnnouncements();
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
  border-radius: var(--border-radius-xl);
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
  border-radius: var(--border-radius-md);
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
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 12px;
  box-shadow: var(--input-shadow);
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