<template>
  <div class="test-container">
    <h2>Loading Spinner Test (Sichtbar?)</h2>

    <p>Spinner 1: Standardgröße (18px), Standardfarbe (weiß) – Gut für dunkle Hintergründe.</p>
    <div class="test-block dark-bg">
      <LoadingSpinner />
      <span class="label">Lade...</span>
    </div>

    <hr>

    <p>Spinner 2: Angepasste Größe und Farbe (var(--primary)) – Gut für helle Hintergründe.</p>
    <div class="test-block light-bg">
      <LoadingSpinner color="var(--primary)" size="2em" border-thickness="3px" />
      <span class="label primary-text">Warte bitte...</span>
    </div>

    <hr>

    <p>Spinner 3: In einem Button, simuliert den Ladezustand.</p>
    <button class="test-btn">
      <LoadingSpinner color="#fff" size="1.2em" />
      Sende ab...
    </button>
  </div>
</template>

<script setup lang="ts">
// Passe den Pfad an, falls dein Spinner in einem anderen Ordner liegt
import LoadingSpinner from '../components/LoadingSpinner.vue';
</script>

<style scoped>
/* Definiere hier deine Testfarben */
:root {
  --primary: #34d399; /* Beispiel-Primärfarbe */
  --dark: #1f2937;
  --light: #f3f4f6;
  --text-dark: #e5e7eb;
  --text-light: #1f2937;
}

.test-container {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  max-width: 400px;
  margin: 20px auto;
  font-family: sans-serif;
}

.test-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
}

.dark-bg {
  background: var(--dark);
  color: var(--text-dark);
}

.light-bg {
  background: var(--light);
  color: var(--text-light);
  border: 1px solid #ddd;
}

.primary-text {
  color: var(--primary);
  font-weight: bold;
}

/* Button-Stil für den Test */
.test-btn {
  background: var(--primary);
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  gap: 8px;
}

hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 20px 0;
}
</style>