<template>
  <div class="global-announcements" v-if="announcements.length && !isWelcomePage">
    <div
        class="global-ann"
        :style="{ backgroundColor: colorFor(currentAnnouncement.color) }"
        @click="nextAnnouncement"
    >
      <div class="global-ann-content">
        <strong>{{ currentAnnouncement.title }}</strong>{{ currentAnnouncement.content }}
        <span class="announcement-counter" v-if="announcements.length > 1">
          ({{ currentIndex + 1 }}/{{ announcements.length }})
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import hw from '../hwApi'

const announcements = ref([])
const currentIndex = ref(0)
const route = useRoute()

const isWelcomePage = computed(() => route.path === '/welcome')

const currentAnnouncement = computed(() => {
  return announcements.value[currentIndex.value] || {}
})

onMounted(async () => {
  if (!isWelcomePage.value) {
    try {
      const { data } = await hw.get('/api/announcements')
      announcements.value = data
      // Setze CSS Variable für die Höhe
      updateAnnouncementHeight()
    } catch (error) {
      console.error('Fehler beim Laden der globalen Ankündigungen', error)
    }
  }
})

// In der updateAnnouncementHeight Funktion
function updateAnnouncementHeight() {
  if (announcements.value.length && !isWelcomePage.value) {
    document.documentElement.style.setProperty('--announcement-height', '45px')
  } else {
    document.documentElement.style.setProperty('--announcement-height', '0px')
  }

  // Dispatch Event für andere Komponenten
  window.dispatchEvent(new CustomEvent('announcement-height-changed'))
}

watch(announcements, updateAnnouncementHeight)
watch(isWelcomePage, updateAnnouncementHeight)

function nextAnnouncement() {
  if (announcements.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % announcements.value.length
  }
}

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
  top: 65px; /* Unter dem Header */
  left: 0;
  width: 100%;
  z-index: 1000;
  cursor: pointer;
}

.global-ann {
  padding: 12px 16px;
  color: white;
  font-size: 14px;
  text-align: center;
  transition: background-color 0.3s ease;
  box-shadow: 12px 12px 2px 1px rgba(5, 5, 5, 0.2);
}

.global-ann-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.announcement-counter {
  font-size: 12px;
  opacity: 0.8;
}

@media (max-width: 500px) {
  .global-announcements {
    top: 68px;
  }

  .global-ann {
    padding: 10px 12px;
  }

  .global-ann-content {
    gap: 4px;
  }
}
</style>