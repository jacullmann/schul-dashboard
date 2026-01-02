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
          <h3>Theme</h3>
          <div class="theme-selector">
            <select
                id="theme-select"
                :value="selectedThemeMode"
                @change="handleThemeChange"
                class="theme-select input hover"
            >
              <option value="system">System</option>
              <option value="light">Heller Modus</option>
              <option value="dark">Dunkler Modus</option>
            </select>
          </div>
          <p class="brand-description">
            Wähle dein bevorzugtes Farbschema für das Schul-Dashboard aus.
          </p>
        </div>

        <!-- Sektion: Kontakt
        <div class="footer-section">
          <h3>Kontakt</h3>
          <p class="superjob">dashboardverifizierung@gmail.com</p>
        </div>
        -->
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p class="text-xs text-sub">Privates Schulprojekt von Schülern einer Berliner Schule</p>
      </div>
    </div>


  </footer>
</template>

<script setup lang="ts">
import { ExternalLink} from "lucide-vue-next";
import { useTheme, ThemeMode } from '../../composables/useTheme';
const { selectedThemeMode, applyTheme } = useTheme();

function handleThemeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  applyTheme(target.value as ThemeMode);
}
const emit = defineEmits(['goToSec', 'goToMain'])
function gotosec() {
  emit('goToSec')
}
function gotomain() {
  emit('goToMain')
}
function goToStatus() {
  window.open('https://stats.uptimerobot.com/m8tUrWG3Zz', '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
.footer {
  background-color: var(--bg);
  padding: 2.5rem 0 0;
  border-top: 1px solid var(--border);
}

.footer-container {
  padding: 0 5px 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-columns {
  display: flex;
  justify-content: flex-start;
  gap: 4rem;
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
  margin-bottom: 0.5rem;
  transition: color 0.2s ease, opacity 0.2s ease;
  cursor: pointer;
  gap: 4px;
  display: flex;
  align-items: center;

}

.footer-bottom {
  border-top: 1px solid var(--border2);
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer-bottom-content p {
  margin: 0;
  line-height: 1;
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