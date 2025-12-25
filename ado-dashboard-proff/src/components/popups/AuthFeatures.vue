<template>
  <transition name="popup-overlay">
    <div v-if="showPopup" class="popup-overlay" @click="closePopup">
      <transition name="popup-content">
        <div class="popup-container" @click.stop>
          <button class="close-btn" @click="closePopup" aria-label="Popup schließen">
            <XIcon size="20" />
          </button>

          <div class="popup-content">
            <div class="icon-header">
              <UserPlusIcon size="48" />
            </div>

            <div class="text-content">
              <h2>Mehr Funktionen freischalten</h2>
              <p>Erstelle einen kostenlosen Account für erweiterte Features:</p>

              <ul class="feature-list">
                <li>
                  <CheckCircleIcon size="18" />
                  Einträge als gemacht makieren
                </li>
                <li>
                  <CheckCircleIcon size="18" />
                  Personalisiertes Dashboard
                </li>
                <li>
                  <CheckCircleIcon size="18" />
                  Private Einträge
                </li>
                <li>
                  <CheckCircleIcon size="18" />
                  Eigene Einträge erstellen & verwalten
                </li>
              </ul>
            </div>

            <div class="action-buttons">
              <button class="btn" @click="registerNow">
                <UserPlusIcon class="showing" size="18" />
                Anmelden
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
import { XIcon, UserPlusIcon, CheckCircleIcon } from 'lucide-vue-next'

const showPopup = ref(false)
const POPUP_STORAGE_KEY = 'account_popup_last_shown'
const POPUP_SHOULD_SHOW_KEY = 'account_popup_should_show'
let popupTimeout: number | null = null

const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('hw_token')
}

const initializePopupSettings = () => {
  const shouldShow = localStorage.getItem(POPUP_SHOULD_SHOW_KEY)

  if (shouldShow === null) {
    localStorage.setItem(POPUP_SHOULD_SHOW_KEY, 'true')
    localStorage.removeItem(POPUP_STORAGE_KEY)
  }
}

const shouldShowPopup = (): boolean => {
  if (isLoggedIn()) {
    return false
  }

  const shouldShow = localStorage.getItem(POPUP_SHOULD_SHOW_KEY)
  if (shouldShow === 'false') {
    return false
  }

  const lastShown = localStorage.getItem(POPUP_STORAGE_KEY)
  if (!lastShown) {
    return true
  }

  const lastShownDate = new Date(lastShown).getTime()
  const oneDayInMs = 24 * 60 * 60 * 1000
  const now = Date.now()

  return now - lastShownDate >= oneDayInMs
}

const showPopupWithRandomDelay = () => {
  if (shouldShowPopup()) {
    const randomDelay = Math.floor(Math.random() * (30000 - 60000 + 1)) + 60000

    popupTimeout = setTimeout(() => {
      showPopup.value = true
      localStorage.setItem(POPUP_STORAGE_KEY, new Date().toISOString())
    }, randomDelay)
  }
}

const closePopup = () => {
  showPopup.value = false
}

const registerNow = () => {
  closePopup()
  localStorage.setItem(POPUP_SHOULD_SHOW_KEY, 'false')

  router.push('/').then(() => {
    window.dispatchEvent(new CustomEvent('show-auth-modal'))
  })
}

const checkLoginStatus = () => {
  if (isLoggedIn()) {
    localStorage.setItem(POPUP_SHOULD_SHOW_KEY, 'false')
    closePopup()
    if (popupTimeout) {
      clearTimeout(popupTimeout)
      popupTimeout = null
    }
  }
}

const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'hw_token') {
    checkLoginStatus()
  }
}

const handleLoginEvent = () => {
  checkLoginStatus()
}

onMounted(() => {
  initializePopupSettings()
  showPopupWithRandomDelay()

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('user-logged-in', handleLoginEvent)
})

onUnmounted(() => {
  if (popupTimeout) {
    clearTimeout(popupTimeout)
  }
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('user-logged-in', handleLoginEvent)
})
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 15, 15, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  box-sizing: border-box;
}

.popup-container {
  position: relative;
  background: var(--card);
  border-radius: 12px;
  padding: 12px;
  max-width: 420px;
  width: 100%;
  border: none;
  box-shadow: var(--shadow-l);
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sub);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.popup-content {
  text-align: center;
  padding: 8px;
}

.icon-header {
  margin-bottom: 20px;
}

.text-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text);
  line-height: 1.3;
}

.text-content p {
  color: var(--sub);
  margin-bottom: 20px;
  line-height: 1.5;
  font-size: 0.95rem;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  text-align: left;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  color: var(--text);
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.feature-list li:last-child {
  border-bottom: none;
}

.feature-list li svg {
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 180px;
}

.popup-overlay-enter-active,
.popup-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.popup-overlay-enter-from,
.popup-overlay-leave-to {
  opacity: 0;
}

.popup-content-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popup-content-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popup-content-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.popup-content-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-10px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .popup-overlay {
    padding: 16px;
  }

  .popup-container {
    max-width: 380px;
  }

  .text-content h2 {
    font-size: 1.35rem;
  }
  .showing {
    display: none;
  }
  .action-buttons {
    display: flex;
    flex-direction: column;
    width: 140px;
  }
}

@media (max-width: 480px) {
  .popup-container {
    max-width: 320px;
    padding: 10px;
  }

  .popup-content {
    padding: 4px;
  }

  .text-content h2 {
    font-size: 1.25rem;
  }

  .feature-list li {
    font-size: 0.85rem;
  }

  .icon-header svg {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 360px) {
  .popup-container {
    max-width: 280px;
  }

  .text-content h2 {
    font-size: 1.15rem;
  }

  .action-buttons {
    gap: 6px;
  }
}
</style>