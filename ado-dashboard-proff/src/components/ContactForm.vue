<template>
  <div class="card">
    <div class="contact-content">
      <header class="contact-header">
        <h2>Kontakt</h2>
        <p>Teile deine Erfahrungen mit uns oder kontaktiere uns direkt.</p>
      </header>

      <div class="contact-sections">
        <div class="contact-section">
          <div class="section-header">
            <Mail class="section-icon" />
            <h3>E-Mail</h3>
          </div>
          <a href="mailto:dashboardverifizierung@gmail.com" class="email-button">
            dashboardverifizierung@gmail.com
            <ExternalLink class="button-icon" />
          </a>
        </div>

        <hr>

        <div class="contact-section">
          <div class="section-header">
            <MapPin class="section-icon" />
            <h3>Region</h3>
          </div>
          <p class="region-text">
            Berlin,<br>
            Deutschland
          </p>
        </div>

        <hr>

        <div
            class="contact-section phone-section"
            @mouseenter="startHoverTimer"
            @mouseleave="clearAndHide"
        >
          <div class="section-header">
            <Phone class="section-icon" />
            <h3>Telefon</h3>
          </div>
          <div class="coming-soon">
            <Clock class="clock-icon" />
            <span>Unsere Telefon-Hotline ist bald verfügbar.</span>
          </div>

          <Transition name="timer-transition">
            <div v-if="isHovering" class="hover-timer-indicator">
              {{ formattedTime }}
            </div>
          </Transition>

          <Transition name="hotline-message">
            <div v-if="showMessage" class="hotline-message">
              <div class="mainme">
                <Smile size="14px"/>
                Nur Spass, es wird erstmal keine geben.
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Mail,
  MapPin,
  Phone,
  ExternalLink,
  Clock,
  Smile
} from 'lucide-vue-next';

const showMessage = ref(false);
const isHovering = ref(false);
const startTime = ref(0);
const elapsedTime = ref(0);
let hoverTimer: number | null = null;
let intervalTimer: number | null = null;
const HOVER_DELAY_MS = 2000;

const formattedTime = computed(() => {
  const remaining = Math.max(0, HOVER_DELAY_MS - elapsedTime.value);
  const seconds = Math.floor(remaining / 1000);
  const milliseconds = Math.floor((remaining % 1000) / 10);

  return `${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}s`;
});

const startInterval = () => {
  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  startTime.value = Date.now();
  elapsedTime.value = 0;

  intervalTimer = setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value;
    if (elapsedTime.value >= HOVER_DELAY_MS) {
      clearInterval(intervalTimer!);
      elapsedTime.value = HOVER_DELAY_MS;
    }
  }, 10);
};

const startHoverTimer = () => {
  isHovering.value = true;
  startInterval();

  if (hoverTimer) {
    clearTimeout(hoverTimer);
  }

  hoverTimer = setTimeout(() => {
    showMessage.value = true;
    isHovering.value = false;
  }, HOVER_DELAY_MS);
};

const clearAndHide = () => {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }

  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }

  showMessage.value = false;
  isHovering.value = false;
  elapsedTime.value = 0;
};
</script>

<style scoped>

.contact-content {
  padding: 8px;
}

.contact-header {
  margin-bottom: 32px;
}

.contact-header h2 {
  margin: 0 0 0 0;
  color: var(--text);
}

.contact-header p {
  margin: 0;
  color: var(--muted);
}

.contact-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-section {
  padding: 16px 0;
  position: relative;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--muted);
}

.contact-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.email-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
  padding: 10px 14px;
  border-radius: 6px;
  text-decoration: none;
  border: none;
  transition: all 0.2s ease;
  font-weight: 500;
}

.email-button:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.button-icon {
  width: 14px;
  height: 14px;
  opacity: 0.8;
}

.region-text {
  margin: 0;
  color: var(--text);
  line-height: 1.5;
  padding-left: 32px;
}

.coming-soon {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-style: italic;
  padding: 10px 14px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 6px;
  border: none;
  width: 370px;
}

.clock-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 0;
  opacity: 0.3;
}

.hotline-message {
  position: absolute;
  top: 100px;
  left: 32px;
  right: 16px;
  padding: 10px 14px;
  background-color: rgba(80, 80, 80, 0.8);
  border-radius: 6px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.4;
  width: 320px;
  align-items: center;
}
.mainme {
  align-items: center;
  margin-bottom: 0;
  display: flex;
  flex-direction: row;
  gap: 6px;
}

.hover-timer-indicator {
  position: absolute;
  top: 6px;
  right: 16px;
  padding: 4px 8px;
  background-color: transparent;
  color: rgba(200, 200, 200, 0.2);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  z-index: 20;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timer-transition-enter-active,
.timer-transition-leave-active {
  transition: opacity 0.1s ease;
}

.timer-transition-enter-from,
.timer-transition-leave-to {
  opacity: 0;
}
.hotline-message-enter-active,
.hotline-message-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.hotline-message-enter-from,
.hotline-message-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.hotline-message-enter-to,
.hotline-message-leave-from {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 500px) {
  .contact-content {
    padding: 4px;
  }

  .section-header {
    gap: 10px;
  }

  .email-button,
  .coming-soon {
    padding: 8px 12px;
    font-size: 14px;
  }

  .region-text {
    padding-left: 28px;
  }

  .hotline-message {
    left: 4px;
    right: 4px;
    top: 90px;
  }

  .hover-timer-indicator {
    right: 4px;
  }
}
</style>