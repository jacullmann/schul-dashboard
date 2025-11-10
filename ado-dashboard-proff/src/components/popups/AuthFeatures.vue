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
                Jetzt registrieren
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

// Prüft ob der Benutzer eingeloggt ist
const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('hw_token')
}

// Initialisiert die Popup-Einstellungen
const initializePopupSettings = () => {
  const shouldShow = localStorage.getItem(POPUP_SHOULD_SHOW_KEY)

  // Wenn shouldShow noch nicht gesetzt ist, auf true setzen
  if (shouldShow === null) {
    localStorage.setItem(POPUP_SHOULD_SHOW_KEY, 'true')
    localStorage.removeItem(POPUP_STORAGE_KEY) // Stelle sicher, dass lastShown null ist
  }
}

// Prüft ob das Popup angezeigt werden soll
const shouldShowPopup = (): boolean => {
  // Wenn Benutzer eingeloggt ist, Popup nie anzeigen
  if (isLoggedIn()) {
    return false
  }

  const shouldShow = localStorage.getItem(POPUP_SHOULD_SHOW_KEY)
  // Wenn shouldShow false ist, Popup nie anzeigen
  if (shouldShow === 'false') {
    return false
  }

  const lastShown = localStorage.getItem(POPUP_STORAGE_KEY)
  // Wenn lastShown null ist, Popup anzeigen
  if (!lastShown) {
    return true
  }

  // Prüfe ob das letzte Anzeigen mehr als 1 Tag her ist
  const lastShownDate = new Date(lastShown).getTime()
  const oneDayInMs = 24 * 60 * 60 * 1000
  const now = Date.now()

  return now - lastShownDate >= oneDayInMs
}

// Zeigt das Popup nach einer zufälligen Zeit an
const showPopupWithRandomDelay = () => {
  if (shouldShowPopup()) {
    // Zufällige Zeit zwischen 1 und 10 Minuten (60.000 - 600.000 ms)
    const randomDelay = Math.floor(Math.random() * (600000 - 60000 + 1)) + 60000

    popupTimeout = setTimeout(() => {
      showPopup.value = true
      // Setze das letzte Anzeige-Datum
      localStorage.setItem(POPUP_STORAGE_KEY, new Date().toISOString())
    }, randomDelay)
  }
}

// Schließt das Popup
const closePopup = () => {
  showPopup.value = false
}

// Registrierungs-Button Handler
const registerNow = () => {
  closePopup()
  // Setze shouldShow auf false - Popup wird nie wieder angezeigt
  localStorage.setItem(POPUP_SHOULD_SHOW_KEY, 'false')

  // Navigiere zur Hauptseite und öffne AuthModal
  router.push('/').then(() => {
    // Dispatch ein Custom Event, das vom Hausaufgaben.vue Component gehört wird
    window.dispatchEvent(new CustomEvent('show-auth-modal'))
  })
}

// Überwacht Login/Logout Änderungen
const checkLoginStatus = () => {
  if (isLoggedIn()) {
    // Wenn Benutzer sich anmeldet, setze shouldShow auf false
    localStorage.setItem(POPUP_SHOULD_SHOW_KEY, 'false')
    closePopup()
    if (popupTimeout) {
      clearTimeout(popupTimeout)
      popupTimeout = null
    }
  }
}

// Event Listener für Storage Änderungen (für andere Tabs)
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'hw_token') {
    checkLoginStatus()
  }
}

// Event Listener für Custom Events (für gleichen Tab)
const handleLoginEvent = () => {
  checkLoginStatus()
}

onMounted(() => {
  initializePopupSettings()
  showPopupWithRandomDelay()

  // Event Listener hinzufügen
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('user-logged-in', handleLoginEvent)
})

onUnmounted(() => {
  // Cleanup
  if (popupTimeout) {
    clearTimeout(popupTimeout)
  }
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('user-logged-in', handleLoginEvent)
})
</script>

<style scoped>
/* Deine bestehenden Styles bleiben unverändert */
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
  color: var(--muted);
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
  color: var(--muted);
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

/* Animations */
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
    fontSize: 1.25rem;
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