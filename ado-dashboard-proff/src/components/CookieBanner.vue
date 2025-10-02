<template>
  <div v-if="show" class="cookie-banner">
    <div class="cookie-content">
      <button class="close" @click="decline">×</button>
      <h3>Cookies & Analytics</h3>
      <p>
        Wir verwenden Cookies, um unsere Website zu verbessern und Google Analytics
        für anonyme Statistiken. Bitte stimme zu, um uns zu helfen.
      </p>
      <div class="actions">
        <button class="btn accept" @click="accept">Akzeptieren</button>
        <button class="btn decline" @click="decline">Ablehnen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const show = ref(false)

onMounted(() => {
  const consent = localStorage.getItem('cookie_consent')
  if (!consent) {
    show.value = true
  } else {
    const parsed = JSON.parse(consent)
    const expires = new Date(parsed.expires)
    if (new Date() > expires) {
      show.value = true
    }
  }
})

function accept() {
  const expires = new Date()
  expires.setDate(expires.getDate() + 28)
  localStorage.setItem('cookie_consent', JSON.stringify({
    accepted: true,
    expires
  }))
  show.value = false
  window.dispatchEvent(new Event('cookie-accepted'))
}

function decline() {
  localStorage.removeItem('cookie_consent')
  show.value = false
}
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: black;
  color: var(--text);
  border-top: 0.1px solid var(--border);
  padding: 16px;
  z-index: 1000;
  display: flex;
  justify-content: center;
}

.cookie-content {
  max-width: 600px;
  width: 100%;
  position: relative;
}

.cookie-content h3 {
  margin: 0 0 8px;
}

.cookie-content p {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 14px;
  border-radius: 5px;
  cursor: pointer;
  border: none;
}

.btn.accept {
  background: var(--primary);
  color: white;
}

.btn.decline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.close {
  position: absolute;
  top: 0;
  right: 0;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: var(--muted);
}
</style>
