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
          <p class="footer-link">Startseite</p>
          <p @click="gotosec" class="footer-link">Rechtliches & Sicherheit</p>
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
        <p class="text-xs text-sub">Alle Rechte vorbehalten</p>
      </div>
    </div>


  </footer>
</template>

<script setup lang="ts">
const emit = defineEmits(['goToSec'])
function gotosec() {
  emit('goToSec')
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
  display: block;
  color: var(--sub);
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.2s ease, opacity 0.2s ease;
  cursor: pointer;
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