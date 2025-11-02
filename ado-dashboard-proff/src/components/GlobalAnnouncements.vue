<template>
  <div class="global-announcements" v-if="announcements.length && !isWelcomePage">
    <div v-for="a in announcements" :key="a._id" class="global-ann" :style="{ backgroundColor: colorFor(a.color) }">
      <div class="global-ann-content">
        <strong>{{ a.title }}</strong>: {{ a.content }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import hw from '../hwApi'

const announcements = ref([])
const route = useRoute()

const isWelcomePage = computed(() => route.path === '/welcome')

onMounted(async () => {
  if (!isWelcomePage.value) {
    try {
      const { data } = await hw.get('/api/announcements')
      announcements.value = data
    } catch (error) {
      console.error('Fehler beim Laden der globalen Ankündigungen', error)
    }
  }
})

function colorFor(color) {
  const map = {
    'ok': 'var(--primary)',
    'warn': 'var(--warn)',
    'danger': 'var(--danger)',
    'expired': '#4b5563',
    'info': '#3b82f6',
  }
  return map[color] || 'var(--muted)'
}
</script>

<style scoped>
.global-announcements {
  position: fixed;
  top: 65px; /* Höhe des Headers anpassen */
  left: 0;
  width: 100%;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.global-ann {
  padding: 8px 16px;
  color: white;
  font-size: 14px;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.global-ann-content {
  max-width: 1200px;
  margin: 0 auto;
}
</style>