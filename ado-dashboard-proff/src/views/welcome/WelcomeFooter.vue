<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-columns">

        <div class="footer-section">
          <h3>Hinweis</h3>
          <p class="text-sub">
            Dies ist eine geschützte und private Applikation. Jeder unbefugte Versuch, die Sicherheitsvorkehrungen zu umgehen oder sensitive Daten (inklusive personenbezogener Daten) zu erlangen oder zu kompromittieren, wird ausnahmslos dokumentiert. Derartige Verstöße werden ausnahmslos und unverzüglich zur Strafanzeige gebracht, unabhängig davon, ob der Versuch erfolgreich war oder ob Daten tatsächlich erlangt wurden.
          </p>
        </div>

        <div class="footer-section">
          <h3>Navigation</h3>
          <p @click="gotomain" class="footer-link">Startseite</p>
          <p @click="gotosec" class="footer-link">Impressum</p>
          <p class="footer-link" @click="goToStatus" >Status<ExternalLink size="14px"/></p>
        </div>
        <div class="footer-section">
          <h3>Design</h3>
          <div class="theme-selector">
            <ThemeDropdown />
          </div>
          <p class="brand-description">
            Wähle dein bevorzugtes Design für das Schul Dashboard aus.
          </p>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container footer-bottom-content">
          <p class="text-xs text-sub">Dies ist ein privates Projekt von Schülern für Schüler</p>
        </div>
      </div>
    </div>




  </footer>
</template>

<script setup lang="ts">
import { ExternalLink} from "lucide-vue-next";
import ThemeDropdown from "../../components/hw/ThemeDropdown.vue";

const emit = defineEmits(['goToSec', 'goToMain'])
function gotosec() {
  emit('goToSec')
}
function gotomain() {
  emit('goToMain')
}
// Statusseite auf Uptimerobot öffnen
function goToStatus() {
  window.open('https://stats.uptimerobot.com/m8tUrWG3Zz', '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
.footer {
  background-color: var(--bg);
  padding: 16px 16px 0 16px;
  border-top: 1px solid var(--border);
}

/* .footer-container {
  padding: 0 5px 2rem;
} */

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

.footer-columns {
  display: flex;
  justify-content: flex-start;
  gap: 64px;
  flex-wrap: wrap;
}

.footer-section {
  flex-basis: 200px;
  flex-grow: 1;
}

.footer-section h3 {
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.footer-section p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--sub);
}

.text-sub {
  color: var(--sub);
}

.footer-link {
  color: var(--sub);
  text-decoration: none;
  transition: color 0.1s ease, opacity 0.2s ease;
  cursor: pointer;
  gap: 4px;
  display: flex;
  align-items: center;
}

.footer-link:hover {
  color: var(--text) !important;
}

.footer-bottom {
  border-top: 1px solid var(--border);
  padding-block: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer-bottom-content p {
  margin: 0;
}
@media (max-width: 768px) {
  .footer-columns {
    gap: 2rem;
  }
  .footer-section {
    flex-basis: 100%;
  }
}
</style>