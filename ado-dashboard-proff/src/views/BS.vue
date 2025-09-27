<template>
  <div class="full">
    <div class="full-c">
      <div class="container">
        <transition name="slide-fade">
          <div v-if="showCard" class="card complaint-card">
            <!-- Header -->
            <transition name="pop">
              <div v-if="showShield" class="header">
                <div class="shield">
                  <svg viewBox="0 0 64 64" class="shield-svg" role="img" aria-label="Secure">
                    <path d="M32 4l20 8v16c0 14-8 24-20 32C20 52 12 42 12 28V12l20-8z" />
                  </svg>
                </div>
                <div>
                  <h2 class="title">Platz für Beschwerden</h2>
                  <p class="small">Alle Sachen, die du abgibst, sind vollkommen anonym.</p>
                </div>
              </div>
            </transition>

            <!-- Formular -->
            <transition name="fade-up">
              <form v-if="showForm" @submit.prevent="onSubmit" class="form">
                <label for="message" class="small">Nachricht</label>
                <textarea
                    id="message"
                    class="input animated-input"
                    rows="8"
                    v-model="message"
                    :disabled="submitting"
                    placeholder="Schreibe deine Beschwerde..."
                    required
                ></textarea>

                <div class="row actions">
                  <button
                      class="btn primary-btn"
                      type="submit"
                      :disabled="submitting || !message.trim()"
                  >
                    <span v-if="!submitting">Anonym absenden</span>
                    <span v-else class="loader"></span>
                  </button>
                  <button
                      class="btn ghost"
                      type="button"
                      @click="reset"
                      :disabled="submitting || !message"
                  >
                    Zurücksetzen
                  </button>
                </div>

                <transition name="fade">
                  <p v-if="feedback" class="small" :class="feedbackClass">{{ feedback }}</p>
                </transition>
              </form>
            </transition>

            <hr />

          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva'; // <-- ersetzen

const message = ref('');
const submitting = ref(false);
const feedback = ref('');
const feedbackClass = ref('');

const showCard = ref(false);
const showShield = ref(false);
const showForm = ref(false);

onMounted(() => {
  // Step-by-step reveal
  setTimeout(() => (showCard.value = true), 200);
  setTimeout(() => (showShield.value = true), 800);
  setTimeout(() => (showForm.value = true), 1400);
});

async function onSubmit() {
  if (!message.value.trim()) return;
  submitting.value = true;
  feedback.value = '';
  feedbackClass.value = '';

  try {
    const fd = new FormData();
    fd.append('message', message.value);

    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error('Fehler beim Senden');

    feedback.value = 'Danke! Deine Nachricht wurde anonym übermittelt.';
    feedbackClass.value = 'ok';
    message.value = '';
  } catch (e) {
    feedback.value = 'Übertragung fehlgeschlagen. Bitte später erneut versuchen.';
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
</script>

<style scoped>
.complaint-card {
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
  padding: 20px;
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
.shield {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34,197,94,0.15), transparent);
}
.shield-svg {
  width: 40px;
  height: 40px;
  fill: var(--primary);
  filter: drop-shadow(0 0 6px rgba(34,197,94,0.35));
  animation: glow 2s ease-in-out infinite alternate;
}

/* Form */
.form {
  display: grid;
  gap: 12px;
}
.animated-input {
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.animated-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
  transform: scale(1.01);
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
.primary-btn {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  position: relative;
}

/* Loader */
.loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* Feedback */
.small.err { color: var(--danger); }
.small.ok { color: var(--primary); }

/* Animations */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes glow {
  from { filter: drop-shadow(0 0 4px rgba(34,197,94,0.2)); }
  to { filter: drop-shadow(0 0 12px rgba(34,197,94,0.6)); }
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.6s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.pop-enter-active {
  transition: all 0.5s cubic-bezier(.68,-0.55,.27,1.55);
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.fade-up-enter-active {
  transition: all 0.6s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
