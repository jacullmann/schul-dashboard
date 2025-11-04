<template>
  <section class="contact-section card" aria-label="Kontaktinformationen">
    <div class="container">
      <div class="hero-header">
        <div class="hero-content">
          <h2 class="hero-title">Kontakt</h2>
          <p class="hero-subtitle">Teile deine Erfahrungen mit uns oder kontaktiere uns direkt.</p>
        </div>
      </div>

      <div class="info-card form-card">

        <div class="info-group">
          <h3 class="info-title">E-Mail</h3>
          <p class="info-text">
            dashboardverifizierung@gmail.com
          </p>
        </div>

        <div class="separator"></div>

        <div class="info-group">
          <h3 class="info-title">Region</h3>
          <p class="info-text">
            Berlin,<br />
            Deutschland
          </p>
        </div>

        <div class="separator"></div>

        <div class="info-group">
          <h3 class="info-title">Telefon</h3>
          <p class="info-text">
            Unsere Telefon-Hotline ist bald verfügbar.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
// Keine Skript-Logik nötig.
</script>

<style scoped>
/* Allgemeine Stile beibehalten */
:root {
  --card: transparent;
  --bg: transparent;
  --text: #f1f1f1;
  --primary: #3f93f8;
}

/* Section */
.contact-section {
  padding: 50px 50px;
  min-height: 50vh;
  background: var(--bg);
}

.card {
  background: var(--bg);
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

/* Hero Header */
.hero-header {
  margin-bottom: 48px;
  text-align: center;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 18px;
  color: #a0a0a0;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Info Card (Layout angepasst auf vertikalen Fluss) */
.info-card {
  max-width: 450px; /* Reduzierte maximale Breite für einen kompakten Look */
  margin: 0 auto;
  background: var(--card);
  border-radius: 16px;
  padding: 48px;

  /* Setzt den Fluss auf vertikal (Standard-Block-Layout) */
  display: flex;
  flex-direction: column;
  gap: 0; /* Kein Gap zwischen den Elementen, da wir Trennlinien verwenden */
}

/* Info Group */
.info-group {
  padding: 0; /* Entfernt Padding, da der Container gepaddet ist */
  transition: none;
}

.info-group:hover {
  background: transparent;
}

.info-title {
  font-size: 24px; /* Größer wie im Original: <h3> */
  font-weight: 700;
  color: var(--text);
  margin-top: 0;
  margin-bottom: 5px; /* Kleinerer Abstand zum Text */
}

.info-text {
  font-size: 16px;
  color: #f1f1f1;
  line-height: 1.6;
  margin: 0;
}

/* Trennlinie für den Look wie im Original mit <br/> */
.separator {
  height: 1px;
  width: 100%;
  margin: 20px 0; /* Vertikaler Abstand */
  background: rgba(255, 255, 255, 0.1); /* Eine dezente Linie */
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .contact-section {
    padding: 40px 20px;
  }

  .info-card {
    padding: 32px 24px;
    max-width: 100%;
  }
}
</style>