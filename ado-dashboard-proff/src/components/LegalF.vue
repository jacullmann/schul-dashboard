<template>
  <div>
    <button class="btn ghost" @click="openPopup">
      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
    </button>

    <div v-if="showPopup"  class="popup-overlay">
      <div class="popup">
        <h2>Rechtliche Hinweise</h2>
        <div class="popup-content">
        <p>Dieser Bereich ist ausschließlich für autorisierte Personen bestimmt. Jeder unbefugte Zugriffsversuch — dazu zählen insbesondere das Umgehen oder Erraten von Passwörtern, Ausnutzen technischer Schwachstellen, Social-Engineering, Brute-Force-Angriffe oder jede Form des Eindringens — stellt einen strafbaren Verstoß dar und wird lückenlos verfolgt. Technische Zugangssperren erfüllen die Anforderungen des § 202a StGB; bereits deren Umgehung ist eine Straftat, unabhängig davon, ob Daten erfolgreich erlangt wurden. Ergänzend greifen §§ 303a und 303b StGB (Datenveränderung und Computersabotage), je nach Schwere des Eingriffs.

          Alle Verbindungsdaten (IP-Adresse, Zeitstempel, User-Agent u. a.) werden protokolliert und können zur Identifizierung und Strafverfolgung herangezogen werden. Fehlendes Impressum oder fehlende Kontaktdaten heben den privaten Schutzstatus nicht auf und begründen keinerlei Recht auf Zugriff. Rechtsprechung bestätigt: Der Wille des Betreibers zur Zugangsbeschränkung ist entscheidend, nicht die äußere Gestaltung der Seite. Wer ohne Berechtigung versucht, einzudringen, begeht eine Straftat — Punkt.

          Unbefugte Zugriffe führen ohne Ausnahme zu: Strafanzeige, zivilrechtlichen Ansprüchen (Unterlassung, Schadensersatz, Kostenerstattung), technischen Gegenmaßnahmen (Blockierung, Beweissicherung, Meldung an Ermittlungsbehörden) sowie gegebenenfalls erweiterten rechtlichen Schritten bei Vertuschungsversuchen. „Ich dachte, das ist öffentlich“ ist kein Argument, sondern ein Eigentor.</p>
        </div>
        <div>
          <button class="btn ma" @click="closePopup">Verstanden</button>
          <button class="btn ghost ma" @click="toGoogle">Nicht verstanden</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showPopup = ref(false)

function openPopup() {
  showPopup.value = true
}

function closePopup() {
  showPopup.value = false
}
function toGoogle() {
  window.location.replace('https://example.com');
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.popup {
  border-radius: 14px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  padding: 1.2rem;
  min-width: 200px;
  max-width: 500px;
  text-align: center;
  color: var(--text);
  z-index: 6000;
}
.ma {
  margin: 0.3rem;
}
.popup-content{
  max-height: 300px;
  overflow-y: auto;
}
</style>
