<template>
  <div class="card complaint-card">
    <div class="header">
      <div>
        <h2 style="margin: 0" class=" title-inf">
          Sorgenbox
          <InfoPop tooltip="Sorgenbox Info" title="Sorgenbox">
            <p style="margin-top: 0">Hier kannst du anonym Beschwerden oder Sachen, die dich bedrücken, abgeben — alle Themen werden akzeptiert. Es wird nicht gespeichert, wer du bist. Du darfst entscheiden, ob du Kontaktinformationen da lässt, falls du gerne eine Rückmeldung hättest.</p>

          </InfoPop>
        </h2>
      </div>
    </div>

    <form @submit.prevent="onSubmit" class="form">
      <div class="textarea-container">
        <textarea
            id="message"
            class="input message-input"
            rows="8"
            v-model="message"
            placeholder="Du kanst über alles schreiben..."
            required
            @input="onTextInput"
            @keydown.ctrl.enter="onSubmit"
            @keydown.meta.enter="onSubmit"
            :maxlength="MAX_LENGTH"
        ></textarea>

        <div class="counter" :class="charCounterClass">
          {{ charCount }} / {{ MAX_LENGTH }}
        </div>
      </div>

      <div class="row actions">
        <button
            class="btn action"
            type="submit"
            :disabled="submitting || !message.trim() || charCount > MAX_LENGTH"
            data-umami-event="Sorgenbox absenden Button"
        >
          <span v-if="!submitting">Anonym absenden</span>
          <LoadingSpinner v-else color="black" size="1.2em" />
        </button>
      </div>

      <p v-if="feedback" class="small" :class="feedbackClass">{{ feedback }}</p>

      <p v-if="charCount > MAX_LENGTH" class="small err">
        Nachricht zu lang (maximal {{ MAX_LENGTH }} Zeichen)
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import LoadingSpinner from '../components/LoadingSpinner.vue'
import hw from "../hwApi"
import InfoPop from '../components/info/InfoModalCenter.vue'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva';
const MAX_LENGTH = 5000;

const message = ref('');
const submitting = ref(false);
const feedback = ref('');
const feedbackClass = ref('');
const cooldownEndTime = ref<number | null>(null);
const cooldownInterval = ref<NodeJS.Timeout | null>(null);

const COOLDOWN_KEY = 'sorgenbox_cooldown_end';

const charCount = computed(() => message.value.length);

const charCounterClass = computed(() => {
  if (charCount.value > MAX_LENGTH) return 'error';
  return 'normal';
});

const onTextInput = () => {
  if (charCount.value > MAX_LENGTH) {
    message.value = message.value.substring(0, MAX_LENGTH);
  }
};

onMounted(() => {
  const savedCooldown = localStorage.getItem(COOLDOWN_KEY);
  if (savedCooldown) {
    const endTime = parseInt(savedCooldown);
    if (endTime > Date.now()) {
      cooldownEndTime.value = endTime;
      startCooldownTimer();
    } else {
      localStorage.removeItem(COOLDOWN_KEY);
    }
  }
});

const isCooldown = computed(() => {
  if (!cooldownEndTime.value) return false;
  return Date.now() < cooldownEndTime.value;
});

// Berechnet die verbleibenden Sekunden für die Anzeige
const getRemainingSeconds = () => {
  if (!cooldownEndTime.value) return 0;
  const remaining = Math.ceil((cooldownEndTime.value - Date.now()) / 1000);
  return Math.max(0, remaining);
};

function saveCooldownToStorage() {
  if (cooldownEndTime.value) {
    localStorage.setItem(COOLDOWN_KEY, cooldownEndTime.value.toString());
  }
}

function removeCooldownFromStorage() {
  localStorage.removeItem(COOLDOWN_KEY);
}

function startCooldownTimer() {
  if (cooldownInterval.value) {
    clearInterval(cooldownInterval.value);
  }

  cooldownInterval.value = setInterval(() => {
    if (!cooldownEndTime.value || Date.now() >= cooldownEndTime.value) {
      stopCooldown();
    }
  }, 1000);
}

function startCooldown() {
  cooldownEndTime.value = Date.now() + 30000; // 30 Sekunden
  saveCooldownToStorage();
  startCooldownTimer();
}

function stopCooldown() {
  if (cooldownInterval.value) {
    clearInterval(cooldownInterval.value);
    cooldownInterval.value = null;
  }
  cooldownEndTime.value = null;
  removeCooldownFromStorage();
}

async function onSubmit() {
  // Validierung
  if (!message.value.trim() || charCount.value > MAX_LENGTH) return;

  // Cooldown Check
  if (isCooldown.value) {
    const remaining = getRemainingSeconds();
    feedback.value = `Bitte warte ${remaining} Sekunden, bevor du eine neue Nachricht sendest.`;
    feedbackClass.value = 'cooldown-info';
    return;
  }

  submitting.value = true;
  feedback.value = '';
  feedbackClass.value = '';

  try {
    const res = await hw.post('/anon/sorgenbox', { message: message.value });

    if (res.status !== 200) throw new Error('Fehler beim Senden');

    feedback.value = 'Danke! Deine Nachricht wurde anonym übermittelt.';
    feedbackClass.value = 'ok';
    message.value = '';

    startCooldown();
  } catch (e: any) {
    if (e.response?.data?.error?.includes('maximal 5000 Zeichen')) {
      feedback.value = 'Die Nachricht ist zu lang.';
    } else {
      feedback.value = 'Übertragung fehlgeschlagen.';
    }
    feedbackClass.value = 'err';
  } finally {
    submitting.value = false;
  }
}

function reset() {
  message.value = '';
  feedback.value = '';
  feedbackClass.value = '';
}

onUnmounted(() => {
  if (cooldownInterval.value) {
    clearInterval(cooldownInterval.value);
  }
});
</script>

<style scoped>
.complaint-card {
  backdrop-filter: blur(8px);
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.form {
  display: grid;
  gap: 16px;
}

.textarea-container {
  position: relative;
}

.counter {
  position:absolute;
  bottom:8px;
  right:12px;
  font-size:var(--font-size-footnote);
  margin:2px 2px;
  -webkit-user-select:none;
  user-select:none
}


.btn {
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-s);
}
.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.small.err { color: var(--danger); }

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>