<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-columns">
        <div class="footer-section">
          <h3>Hinweis</h3>
          <p>Dies ist eine geschützte und private Applikation. Jeder unbefugte Versuch, die Sicherheitsvorkehrungen zu umgehen oder sensitive Daten (inklusive personenbezogener Daten) zu erlangen oder zu kompromittieren, wird ausnahmslos dokumentiert. Derartige Verstöße werden ausnahmslos und unverzüglich zur Strafanzeige gebracht, unabhängig davon, ob der Versuch erfolgreich war oder ib Daten tatsächlich erlangt wurde.</p>
        </div>

        <div class="footer-section">
          <h3>Navigation</h3>
          <p class="footer-link">Startseite</p>
          <!--<p class="footer-link">Rechtliches & Sicherheit</p>-->
        </div>

        <!--<div class="footer-section">
          <h3>Kontakt</h3>
          <p class="superjob">dashboardverifizierung@gmail.com</p>

        </div>-->
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p> Alle Rechte vorbehalten</p>
      </div>

    </div>


  </footer>
</template>

<script setup lang="ts">
</script>

<style scoped>
.footer {
  background-color: var(--bg);
  color: #f1f1f1;
  padding: 2rem 5px 5px;
}

.footer-container {
  padding-bottom: 1rem;
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
  color: #f1f1f1;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.footer-section p {
  font-size: 0.9rem;
  line-height: 1.6;
}

.footer-link {
  display: block;
  color: var(--text);
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #b0b0b0;
}

.footer-bottom {
  border-top: 1px solid #333;
  padding: 0.1rem 1px;
  font-size: 0.8rem;
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .footer-columns {
    flex-direction: column;
    gap: 1.5rem;
    text-align: left;
  }
  .footer-bottom-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .footer {
    padding: 2rem 16px 5px;
  }
}
</style>
