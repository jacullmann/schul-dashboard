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
    <div class="announcement-menu-overlay" v-if="showMenu" @click="showMenu = false">
      <div class="announcement-menu" @click.stop>
        <div class="announcement-menu-header">
          <h4>Alle Ankündigungen</h4>
          <button class="close-btn" @click="showMenu = false">×</button>
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import hw from '../hwApi'
import AnnouncementPopup from './popups/AnnouncementPopup.vue' // NEU: Popup Component

const announcements = ref([])
const currentIndex = ref(0)
const showMenu = ref(false) // NEU: Menu State
const showPopup = ref(false) // NEU: Popup State
const currentPopupAnnouncement = ref(null) // NEU: Current Popup
const route = useRoute()

const isWelcomePage = computed(() => route.path === '/welcome')

const currentAnnouncement = computed(() => {
  return announcements.value[currentIndex.value] || {}
})

// NEU: Local Storage für gesehene Popups
const getSeenPopups = () => {
  try {
    return JSON.parse(localStorage.getItem('seenAnnouncementPopups') || '[]')
  } catch {
    return []
  }
}

const markPopupAsSeen = (announcementId) => {
  const seen = getSeenPopups()
  if (!seen.includes(announcementId)) {
    seen.push(announcementId)
    localStorage.setItem('seenAnnouncementPopups', JSON.stringify(seen))
  }
}

onMounted(async () => {
  if (!isWelcomePage.value) {
    try {
      const { data } = await hw.get('/api/announcements')
      announcements.value = data
      updateAnnouncementHeight()

      // NEU: Popup für neue Ankündigungen anzeigen
      checkForNewPopups(data)
    } catch (error) {
      console.error('Fehler beim Laden der globalen Ankündigungen', error)
    }
  }
})

// NEU: Popup-Logik
function checkForNewPopups(announcements) {
  const seenPopups = getSeenPopups()

  for (const announcement of announcements) {
    // Nur Popups anzeigen, die als Popup markiert sind und noch nicht gesehen wurden
    if (announcement.showAsPopup && !seenPopups.includes(announcement._id)) {
      currentPopupAnnouncement.value = announcement
      showPopup.value = true
      markPopupAsSeen(announcement._id)
      break // Nur ein Popup gleichzeitig anzeigen
    }
  }
}

// NEU: Popup schließen
function closePopup() {
  showPopup.value = false
  currentPopupAnnouncement.value = null
}

// NEU: Menu Funktionen
function toggleMenu() {
  showMenu.value = !showMenu.value
}

function selectAnnouncement(index) {
  currentIndex.value = index
  showMenu.value = false
}

function nextAnnouncement() {
  if (announcements.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % announcements.value.length
  }
}

function updateAnnouncementHeight() {
  if (announcements.value.length && !isWelcomePage.value) {
    document.documentElement.style.setProperty('--announcement-height', '45px')
  } else {
    document.documentElement.style.setProperty('--announcement-height', '0px')
  }
  window.dispatchEvent(new CustomEvent('announcement-height-changed'))
}

watch(announcements, updateAnnouncementHeight)
watch(isWelcomePage, updateAnnouncementHeight)

function colorFor(color) {
  const map = {
    'ok': 'var(--primary)',
    'warn': 'var(--warn)',
    'danger': 'var(--danger)',
    'expired': '#4b5563',
    'info': '#282828',
  }
  return map[color] || 'var(--muted)'
}
</script>

<style scoped>
.global-announcements {
  position: fixed;
  top: 65px;
  left: 0;
  width: 100%;
  z-index: 1000;
}

.global-ann {
  padding: 12px 16px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 6px rgba(5, 5, 5, 0.2);
  min-height: 45px;
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
  white-space: wrap;
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
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: 12px;
}

.announcement-menu-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

/* NEU: Menu Overlay Styles */
.announcement-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.announcement-menu {
  background: var(--card);
  border-radius: 12px;
  padding: 0;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.announcement-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.announcement-menu-header h4 {
  margin: 0;
  color: var(--text);
}

.close-btn {
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
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--jj);
}

.announcement-list {
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px;
}

.announcement-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 12px;
}

.announcement-item:hover {
  background: var(--jj);
}

.announcement-item.active {
  background: var(--primary);
  color: white;
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
  .global-announcements {
    top: 67px;
  }

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