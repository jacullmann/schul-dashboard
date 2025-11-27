<template>
  <div class="global-announcements" v-if="announcements.length && !isWelcomePage">
    <div
        class="global-ann"
        :style="{ backgroundColor: colorFor(currentAnnouncement.color) }"
    >
      <div class="global-ann-content">
        <div class="announcement-header">
          <strong class="announcement-title">{{ currentAnnouncement.title }}</strong>
          <div class="announcement-controls">
            <span class="announcement-counter">
              {{ currentIndex + 1 }}/{{ announcements.length }}
            </span>
            <button class="announcement-menu-btn" @click.stop="toggleMenu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="announcement-body">
          <div class="announcement-content-text" :class="{ truncated: isContentTruncated }">
            {{ currentAnnouncement.content }}
          </div>
        </div>
      </div>

      <!-- Menu für alle Ankündigungen -->
      <div class="announcements-menu" v-if="showMenu" v-click-outside="closeMenu">
        <div class="menu-header">
          <h3>Alle Ankündigungen</h3>
          <button class="close-menu-btn" @click="closeMenu">×</button>
        </div>
        <div class="menu-content">
          <div
              v-for="(ann, index) in announcements"
              :key="ann._id"
              class="menu-item"
              :class="{ active: index === currentIndex }"
              @click="selectAnnouncement(index)"
          >
            <div class="menu-item-title">{{ ann.title }}</div>
            <div class="menu-item-preview">{{ truncateText(ann.content, 50) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Popup für neue Ankündigungen -->
    <AnnouncementPopup
        v-if="showPopup"
        :announcement="popupAnnouncement"
        @close="closePopup"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import hw from '../hwApi'
import AnnouncementPopup from './popups/AnnouncementPopup.vue'

const announcements = ref([])
const currentIndex = ref(0)
const showMenu = ref(false)
const showPopup = ref(false)
const popupAnnouncement = ref(null)
const isContentTruncated = ref(false)
const route = useRoute()

const isWelcomePage = computed(() => route.path === '/welcome')
const currentAnnouncement = computed(() => {
  return announcements.value[currentIndex.value] || {}
})

// Direktive für Klick außerhalb
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

onMounted(async () => {
  if (!isWelcomePage.value) {
    await loadAnnouncements()
  }
})

async function loadAnnouncements() {
  try {
    const { data } = await hw.get('/api/announcements')
    announcements.value = data
    updateAnnouncementHeight()

    // Prüfe auf neue Ankündigungen für Popups
    checkForNewAnnouncements(data)
  } catch (error) {
    console.error('Fehler beim Laden der globalen Ankündigungen', error)
  }
}

function checkForNewAnnouncements(announcements) {
  const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]')

  announcements.forEach(announcement => {
    const isSeen = seenAnnouncements.includes(announcement._id)
    if (!isSeen) {
      // Zeige Popup für diese Ankündigung
      showAnnouncementPopup(announcement)
      // Markiere als gesehen
      markAsSeen(announcement._id)
    }
  })
}

function showAnnouncementPopup(announcement) {
  popupAnnouncement.value = announcement
  showPopup.value = true
}

function closePopup() {
  showPopup.value = false
  popupAnnouncement.value = null
}

function markAsSeen(announcementId) {
  const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]')
  if (!seenAnnouncements.includes(announcementId)) {
    seenAnnouncements.push(announcementId)
    localStorage.setItem('seenAnnouncements', JSON.stringify(seenAnnouncements))
  }
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

function selectAnnouncement(index) {
  currentIndex.value = index
  closeMenu()
}

function truncateText(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function updateAnnouncementHeight() {
  if (announcements.value.length && !isWelcomePage.value) {
    document.documentElement.style.setProperty('--announcement-height', '80px')
  } else {
    document.documentElement.style.setProperty('--announcement-height', '0px')
  }
  window.dispatchEvent(new CustomEvent('announcement-height-changed'))
}

// Prüfe ob Inhalt abgeschnitten wird
watch(currentAnnouncement, async () => {
  await nextTick()
  checkContentTruncation()
})

function checkContentTruncation() {
  const contentElement = document.querySelector('.announcement-content-text')
  if (contentElement) {
    isContentTruncated.value = contentElement.scrollWidth > contentElement.clientWidth
  }
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

watch(announcements, updateAnnouncementHeight)
watch(isWelcomePage, updateAnnouncementHeight)
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
  box-shadow: 0 8px 6px rgba(5, 5, 5, 0.2);
  position: relative;
}

.global-ann-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.announcement-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.announcement-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

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
}

.announcement-menu-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.announcement-body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 20px;
}

.announcement-content-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.3s ease;
}

.announcement-content-text.truncated {
  animation: scrollText 15s linear infinite;
}

.announcement-scroll-hint {
  font-size: 11px;
  opacity: 0.7;
  flex-shrink: 0;
}

.announcements-menu {
  position: absolute;
  top: 100%;
  right: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  min-width: 300px;
  max-width: 400px;
  max-height: 400px;
  overflow-y: auto;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.menu-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-menu-btn {
  background: none;
  border: none;
  color: var(--text);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-content {
  padding: 8px 0;
}

.menu-item {
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.menu-item.active {
  border-left-color: currentColor;
  background: rgba(255, 255, 255, 0.1);
}

.menu-item-title {
  font-weight: bold;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item-preview {
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes scrollText {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(calc(100% - 100vw));
  }
  100% {
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .global-announcements {
    top: 67px;
  }

  .global-ann {
    padding: 10px 12px;
  }

  .announcements-menu {
    right: 8px;
    left: 8px;
    min-width: auto;
    max-width: none;
  }

  .announcement-scroll-hint {
    display: none;
  }
}
</style>