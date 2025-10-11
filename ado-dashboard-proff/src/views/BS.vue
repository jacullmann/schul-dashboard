<template>
  <div class="full">
    <div class="full-c">
      <div class="container">
        <div class="card complaint-card">

          <div class="header">
            <div>
              <h2 class="title">Platz für Beschwerden</h2>
              <p class="small" style="color: var(--sub)">Alle Sachen, die du abgibst, sind vollkommen anonym.</p>
            </div>
          </div>

          <form @submit.prevent="onSubmit" class="form">
            <label for="message" style="color: var(--sub)" class="small">Nachricht</label>
            <textarea
                id="message"
                class="input message-input"
                rows="8"
                v-model="message"
                :disabled="submitting"
                placeholder="Schreibe deine Beschwerde..."
                required
            ></textarea>

            <div class="row actions">
              <button
                  class="btn"
                  type="submit"
                  :disabled="submitting || !message.trim()"
              >
                <span v-if="!submitting">Anonym absenden</span>
                <LoadingSpinner v-else color="black" size="1.2em" />
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

            <p v-if="feedback" class="small" :class="feedbackClass">{{ feedback }}</p>
          </form>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LoadingSpinner from '../components/LoadingSpinner.vue' // Pfad prüfen

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva';

const message = ref('');
const submitting = ref(false);
const feedback = ref('');
const feedbackClass = ref('');

// onSubmit Funktion bleibt unverändert
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
    feedback.value = 'Übertragung fehlgeschlagen. Du kannst es nochmal versuchen oder uns kontaktieren.';
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
/* Die Grundkarte und Buttons behalten ihr Aussehen */
.complaint-card {
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
  padding: 20px;
  border: 1px solid var(--border); /* Rand wiederhergestellt für Card-Optik */
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

/* Der Shield-Bereich wurde entfernt. */

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
  resize: vertical; /* Lässt das Textfeld in der Höhe verändern */
}

/* WICHTIG: Entfernt den Fokus-Effekt */
.input:focus {
  outline: none; /* Entfernt den Standard-Browser-Fokus-Ring */
  border-color: var(--border, #444); /* Hält den Rand auf der Normalfarbe */
  box-shadow: none; /* Entfernt den grünen Schatten */
  transform: none; /* Entfernt die Skalierung */
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

/* Animationen entfernt */
</style>