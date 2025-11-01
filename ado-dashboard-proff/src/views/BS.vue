<template>
  <div class="card complaint-card">
    <div class="header">
      <div>
        <h2 class="title">Sorgenbox</h2>
        <p class="small" style="color: var(--sub)">
          Hier kannst du anonym Beschwerden oder Sachen, die dich bedrücken, abgeben — alle Themen werden akzeptiert. Es wird nicht gespeichert, wer du bist. Du darfst entscheiden, ob du Kontaktinformationen da lässt, falls du gerne eine Rückmeldung hättest.
        </p>
      </div>
    </div>

    <form @submit.prevent="onSubmit" class="form">
      <textarea
          id="message"
          class="input message-input"
          rows="8"
          v-model="message"
          :disabled="submitting || isCooldown"
          placeholder="Du kanst über alles schreiben..."
          required
      ></textarea>

      <div class="row actions">
        <button
            class="btn"
            type="submit"
            :disabled="submitting || !message.trim() || isCooldown"
            data-umami-event="Sorgenbox absenden Button"
        >
          <span v-if="!submitting && !isCooldown">Anonym absenden</span>
          <span v-else-if="isCooldown">Cooldown: {{ cooldownSeconds }}s</span>
          <LoadingSpinner v-else color="black" size="1.2em" />
        </button>
      </div>

      <p v-if="feedback && !isCooldown" class="small" :class="feedbackClass">{{ feedback }}</p>
      <p v-if="isCooldown" class="small cooldown-info">
        Bitte warte {{ cooldownSeconds }} Sekunden, bevor du eine neue Nachricht sendest.
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import LoadingSpinner from '../components/LoadingSpinner.vue'
import hw from "../hwApi"

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva';

const message = ref('');
const submitting = ref(false);
const feedback = ref('');
const feedbackClass = ref('');
const cooldownEndTime = ref<number | null>(null);
const cooldownInterval = ref<NodeJS.Timeout | null>(null);

// Computed properties für Cooldown
const isCooldown = computed(() => {
  if (!cooldownEndTime.value) return false;
  return Date.now() < cooldownEndTime.value;
});

const cooldownSeconds = computed(() => {
  if (!cooldownEndTime.value) return 0;
  const remaining = Math.ceil((cooldownEndTime.value - Date.now()) / 1000);
  return Math.max(0, remaining);
});

// Cooldown starten
function startCooldown() {
  cooldownEndTime.value = Date.now() + 30000; // 30 Sekunden

  // Interval für Live-Countdown
  if (cooldownInterval.value) {
    clearInterval(cooldownInterval.value);
  }

  cooldownInterval.value = setInterval(() => {
    if (!cooldownEndTime.value || Date.now() >= cooldownEndTime.value) {
      stopCooldown();
    }
  }, 1000);
}

// Cooldown stoppen und cleanup
function stopCooldown() {
  if (cooldownInterval.value) {
    clearInterval(cooldownInterval.value);
    cooldownInterval.value = null;
  }
  cooldownEndTime.value = null;
}

async function onSubmit() {
  if (!message.value.trim() || isCooldown.value) return;

  submitting.value = true;
  feedback.value = '';
  feedbackClass.value = '';

  try {
    const res = await hw.post('/anon/sorgenbox', { message: message.value });

    if (res.status !== 200) throw new Error('Fehler beim Senden');

    feedback.value = 'Danke! Deine Nachricht wurde anonym übermittelt.';
    feedbackClass.value = 'ok';
    message.value = '';

    // Cooldown starten nach erfolgreichem Senden
    startCooldown();
  } catch (e) {
    feedback.value = 'Übertragung fehlgeschlagen. Versuche es nochmal.';
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

// Cleanup beim Zerstören der Komponente
onUnmounted(() => {
  stopCooldown();
});
</script>

<style scoped>
.complaint-card {
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
}

/* Header */
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.title {
  margin: 0 0 4px 0;
  color: var(--text);
}

/* Form */
.form {
  display: grid;
  gap: 12px;
}

/* Input/Textarea Styling */
.input {
  border-radius: 6px;
  background: var(--jj, #222);
  padding: 10px;
  color: var(--text);
  font-family: inherit;
  resize: vertical;
}

/* WICHTIG: Entfernt den Fokus-Effekt */
.input:focus {
  outline: none;
  border-color: var(--border, #444);
  box-shadow: none;
  transform: none;
}

/* Buttons */
.btn {
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.btn:active:not(:disabled) {
  transform: translateY(1px);
}
.btn-special{
  background-color: black;
  color: var(--text);
}

.btn-special:hover {
  background-color:#3F3F3F;
  color: var(--text);
}

/* Feedback */
.small.err { color: var(--danger); }
.small.ok { color: var(--text); }

/* Cooldown Info */
.cooldown-info {
  color: var(--sub);
  font-style: italic;
}

/* Cooldown Button Styling */
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>